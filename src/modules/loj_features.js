/**
 * src/modules/loj_features.js  —  v1.0.0
 * 10 Lojistik Geliştirme Özelliği
 * #1 Timeline  #2 Navlun Karşılaştırma  #3 ETA Push
 * #4 Durum Geçmişi  #5 Toplu Güncelleme  #6 Masraf Takibi
 * #7 Müşteri Özeti  #8 Demuraj Alarm  #9 Belge Yönetimi
 * #10 Performans Raporu
 */
'use strict';

// ════════════════════════════════════════════════════════════════
// #1 — KONTEYNER ZAMAN ÇİZELGESİ (Timeline)
// ════════════════════════════════════════════════════════════════

function showKonteynTimeline(id) {
  const konts = typeof loadKonteyn==='function' ? loadKonteyn() : [];
  const k = konts.find(x => x.id === id);
  if (!k) return;

  const history = (typeof loadKargoHistory==='function' ? loadKargoHistory() : {})[id] || [];

  const events = [
    { ts: k.createdAt,         label: 'Konteyner oluşturuldu',         done: true  },
    { ts: k.evrakTarih,        label: 'Evrak gönderildi',              done: !!k.evrakTarih        },
    { ts: k.evrakUlastiTarih,  label: 'Müşteri evrak teslim aldı',     done: !!k.evrakUlastiTarih  },
    { ts: k.inspectionTarih,   label: 'Inspection tamamlandı',         done: !!k.inspectionTarih   },
    { ts: k.malTeslimTarih,    label: 'Müşteri malları teslim aldı',   done: !!k.malTeslimTarih    },
    { ts: k.closedAt,          label: 'Konteyner kapatıldı',           done: !!k.closedAt          },
    ...history.map(h => ({ ts: h.ts, label: h.note, done: true, extra: true })),
  ].filter(e => e.done).sort((a,b) => (a.ts||'').localeCompare(b.ts||''));

  const etaDate = k.eta ? new Date(k.eta) : null;
  const daysLeft = etaDate ? Math.ceil((etaDate - new Date()) / 86400000) : null;

  const mo = document.createElement('div');
  mo.className = 'mo open'; mo.id = 'mo-ktn-timeline'; mo.style.zIndex = '2300';

  let html = '<div class="moc" style="max-width:460px;padding:0;border-radius:10px;overflow:hidden;max-height:90vh;display:flex;flex-direction:column">'
    + '<div style="padding:14px 18px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">'
      + '<div><div style="font-size:14px;font-weight:600;font-family:monospace">' + k.no + '</div>'
        + '<div style="font-size:11px;color:var(--t3)">' + (k.hat||'') + (k.fromPort&&k.toPort?' · '+k.fromPort+' → '+k.toPort:'') + '</div>'
      + '</div>'
      + '<button onclick="document.getElementById(\'mo-ktn-timeline\').remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button>'
    + '</div>'

    // ETA durumu
    + (k.eta ? '<div style="padding:10px 18px;border-bottom:1px solid var(--b);background:var(--s2);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">'
      + '<span style="font-size:12px;color:var(--t2)">ETA: <strong>' + k.eta + '</strong></span>'
      + (daysLeft !== null ? '<span style="font-size:12px;font-weight:500;color:' + (daysLeft<=0?'#A32D2D':daysLeft<=5?'#854F0B':'#3B6D11') + '">' + (daysLeft<=0?'Geçti':daysLeft+' gün kaldı') + '</span>' : '')
    + '</div>' : '')

    + '<div style="padding:16px 18px;overflow-y:auto;flex:1">';

  if (!events.length) {
    html += '<div style="text-align:center;color:var(--t3);font-size:12px;padding:20px">Henüz kayıt yok</div>';
  } else {
    events.forEach((e, i) => {
      html += '<div style="display:flex;gap:14px;align-items:flex-start;' + (i<events.length-1?'margin-bottom:0;':'') + '">'
        + '<div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0">'
          + '<div style="width:10px;height:10px;border-radius:50%;background:' + (e.extra?'#854F0B':'#3B6D11') + ';margin-top:3px"></div>'
          + (i<events.length-1 ? '<div style="width:1px;flex:1;background:var(--b);min-height:24px"></div>' : '')
        + '</div>'
        + '<div style="padding-bottom:16px;flex:1">'
          + '<div style="font-size:12px;font-weight:' + (e.extra?'400':'500') + ';color:var(--t)">' + e.label + '</div>'
          + '<div style="font-size:11px;color:var(--t3);font-family:monospace;margin-top:2px">' + (e.ts||'').slice(0,16) + '</div>'
        + '</div>'
      + '</div>';
    });
  }

  html += '</div>'
    + '<div style="padding:11px 16px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:space-between;align-items:center;flex-shrink:0">'
      + '<button onclick="_addKonteynNote(' + id + ')" class="btn btns" style="font-size:12px">+ Not Ekle</button>'
      + '<button onclick="document.getElementById(\'mo-ktn-timeline\').remove()" class="btn" style="font-size:12px">Kapat</button>'
    + '</div>'
  + '</div>';

  mo.innerHTML = html;
  document.getElementById('mo-ktn-timeline')?.remove();
  document.body.appendChild(mo);
  mo.addEventListener('click', e => { if(e.target===mo) mo.remove(); });
}

function _addKonteynNote(id) {
  const note = prompt('Nota ekle:');
  if (!note?.trim()) return;
  const h = typeof loadKargoHistory==='function' ? loadKargoHistory() : {};
  if (!h[id]) h[id] = [];
  h[id].push({ ts: (typeof nowTs==='function'?nowTs():new Date().toLocaleString('tr-TR')), note: note.trim() });
  if (typeof storeKargoHistory==='function') storeKargoHistory(h);
  document.getElementById('mo-ktn-timeline')?.remove();
  showKonteynTimeline(id);
  window.toast?.('Not eklendi', 'ok');
}

// Timeline'a durum değişikliği otomatik kaydet
function _logKonteynEvent(id, note) {
  if (typeof loadKargoHistory !== 'function') return;
  const h = loadKargoHistory();
  if (!h[id]) h[id] = [];
  h[id].push({ ts: (typeof nowTs==='function'?nowTs():new Date().toLocaleString('tr-TR')), note });
  storeKargoHistory(h);
}

// ════════════════════════════════════════════════════════════════
// #2 — NAVLUN TEKLİF KARŞILAŞTIRMA
// ════════════════════════════════════════════════════════════════

function showNavlunKarsilastir(from, to, tip) {
  const items = (typeof loadNavlun==='function' ? loadNavlun() : [])
    .filter(n => n.durum !== 'reddedildi')
    .filter(n => (!from || n.from === from) && (!to || n.to === to) && (!tip || n.tasimaTipi === tip))
    .sort((a,b) => (a.birimFiyat||0) - (b.birimFiyat||0));

  if (!items.length) { window.toast?.('Karşılaştırılacak teklif bulunamadı', 'err'); return; }

  const mo = document.createElement('div');
  mo.className = 'mo open'; mo.id = 'mo-nvl-karsi'; mo.style.zIndex = '2200';

  const cols = ['Taşıyıcı','Tip','Fiyat','Transit','Geçerlilik','Durum',''];
  const minPrice = Math.min(...items.map(n=>+n.birimFiyat||0));
  const minTT    = Math.min(...items.map(n=>+n.transitSure||999));

  mo.innerHTML = '<div class="moc" style="max-width:680px;padding:0;border-radius:10px;overflow:hidden;max-height:90vh;display:flex;flex-direction:column">'
    + '<div style="padding:14px 18px;border-bottom:1px solid var(--b);display:flex;justify-content:space-between;align-items:center;flex-shrink:0">'
      + '<div><div style="font-size:14px;font-weight:600">Teklif Karşılaştırma</div>'
        + '<div style="font-size:11px;color:var(--t3)">' + items.length + ' teklif · ' + (from||'?') + ' → ' + (to||'?') + '</div>'
      + '</div>'
      + '<button onclick="document.getElementById(\'mo-nvl-karsi\').remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button>'
    + '</div>'
    + '<div style="overflow:auto;flex:1">'
      + '<table style="width:100%;border-collapse:collapse;font-size:12px">'
        + '<thead><tr style="background:var(--s2)">' + cols.map(c=>'<th style="padding:9px 14px;text-align:left;font-size:10px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.04em;white-space:nowrap">'+c+'</th>').join('') + '</tr></thead>'
        + '<tbody>'
        + items.map(n => {
            const isMinP = (+n.birimFiyat||0) === minPrice;
            const isMinT = (+n.transitSure||999) === minTT;
            const st = {bekliyor:'#854F0B',onaylandi:'#3B6D11',suresi_gec:'#A32D2D'}[n.durum]||'var(--t2)';
            return '<tr style="border-bottom:1px solid var(--b)' + (isMinP?';background:rgba(59,109,17,.03)':'') + '">'
              + '<td style="padding:10px 14px;font-weight:500">' + (n.tasiyan||'—') + '</td>'
              + '<td style="padding:10px 14px;color:var(--t2)">' + (n.aracTipi||n.tasimaTipi||'—') + '</td>'
              + '<td style="padding:10px 14px;font-weight:600;color:' + (isMinP?'#3B6D11':'var(--t)') + '">' + (n.para||'USD') + ' ' + Number(n.birimFiyat||0).toLocaleString('tr-TR') + (isMinP?' ★':'') + '</td>'
              + '<td style="padding:10px 14px;color:' + (isMinT?'#3B6D11':'var(--t2)') + '">' + (n.transitSure?n.transitSure+' gün':'—') + (isMinT?' ★':'') + '</td>'
              + '<td style="padding:10px 14px;color:var(--t3);font-family:monospace">' + (n.gecerlilikBitis||'—') + '</td>'
              + '<td style="padding:10px 14px"><span style="font-size:11px;padding:2px 8px;border-radius:4px;background:rgba(0,0,0,.05);color:'+st+'">' + ({bekliyor:'Bekliyor',onaylandi:'Onaylı',suresi_gec:'Geçmiş'}[n.durum]||n.durum) + '</span></td>'
              + '<td style="padding:10px 14px">'
                + (n.durum==='bekliyor' ? '<button onclick="navlunOnayla('+n.id+');document.getElementById(\'mo-nvl-karsi\').remove();renderNavlun();" class="btn btns" style="font-size:11px;padding:2px 8px">Onayla</button>' : '')
              + '</td>'
            + '</tr>';
          }).join('')
        + '</tbody>'
      + '</table>'
    + '</div>'
    + '<div style="padding:10px 16px;border-top:1px solid var(--b);background:var(--s2);font-size:11px;color:var(--t3);flex-shrink:0">★ En düşük fiyat / En hızlı transit</div>'
  + '</div>';

  document.getElementById('mo-nvl-karsi')?.remove();
  document.body.appendChild(mo);
  mo.addEventListener('click', e => { if(e.target===mo) mo.remove(); });
}

// ════════════════════════════════════════════════════════════════
// #3 — OTOMATİK ETA HATIRLATMA
// ════════════════════════════════════════════════════════════════

let _etaCheckInterval = null;

function startEtaAlarms() {
  clearInterval(_etaCheckInterval);
  _checkEtaAlarms();
  _etaCheckInterval = setInterval(_checkEtaAlarms, 30 * 60 * 1000); // 30dk'da bir
}

function _checkEtaAlarms() {
  if (typeof loadKonteyn !== 'function') return;
  const konts  = loadKonteyn().filter(k => !k.closed && k.eta);
  const today  = new Date();
  const checks = typeof loadKargoChecks==='function' ? loadKargoChecks() : {};
  let   changed = false;

  konts.forEach(k => {
    const dl = Math.ceil((new Date(k.eta) - today) / 86400000);
    const prev = checks[k.id]?.lastAlertDl ?? 999;
    const key  = 'eta_' + k.id;

    [10, 5, 3, 1, 0].forEach(threshold => {
      if (dl <= threshold && prev > threshold) {
        const msg = dl <= 0
          ? k.no + ': ETA geçti! Durumu güncelleyin.'
          : k.no + ': ETA ' + k.eta + ' — ' + dl + ' gün kaldı.';
        window.addNotif?.('🚢', msg, dl <= 0 ? 'err' : dl <= 3 ? 'warn' : 'info', 'kargo');
        // Browser Push
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Konteyner ETA Alarmı', { body: msg, icon: '/assets/icon-192.png' });
        }
        if (!checks[k.id]) checks[k.id] = {};
        checks[k.id].lastAlertDl = dl;
        changed = true;
      }
    });
  });

  if (changed && typeof storeKargoChecks === 'function') storeKargoChecks(checks);
}

function requestEtaNotifPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission().then(p => {
      if (p === 'granted') window.toast?.('ETA bildirimleri açıldı ✓', 'ok');
    });
  }
}

// ════════════════════════════════════════════════════════════════
// #4 — KARGO DURUM GEÇMİŞİ
// ════════════════════════════════════════════════════════════════

function _logKargoStatus(id, oldStatus, newStatus, actor) {
  if (typeof loadKargoHistory !== 'function') return;
  const h = loadKargoHistory();
  if (!h['k_' + id]) h['k_' + id] = [];
  h['k_' + id].push({
    ts:  typeof nowTs==='function' ? nowTs() : new Date().toLocaleString('tr-TR'),
    from: oldStatus, to: newStatus, by: actor
  });
  storeKargoHistory(h);
}

function showKargoHistory(id) {
  const kargo = typeof loadKargo==='function' ? loadKargo() : [];
  const k = kargo.find(x => x.id === id);
  if (!k) return;
  const users = typeof loadUsers==='function' ? loadUsers() : [];
  const h = (typeof loadKargoHistory==='function' ? loadKargoHistory() : {})['k_'+id] || [];

  const ST_COLORS = { bekle:'#854F0B', yolda:'#185FA5', teslim:'#3B6D11', iade:'#A32D2D' };
  const ST_LABELS = { bekle:'Beklemede', yolda:'Yolda', teslim:'Teslim', iade:'İade' };

  const mo = document.createElement('div');
  mo.className = 'mo open'; mo.id = 'mo-krg-history'; mo.style.zIndex = '2300';

  mo.innerHTML = '<div class="moc" style="max-width:440px;padding:0;border-radius:10px;overflow:hidden;max-height:85vh;display:flex;flex-direction:column">'
    + '<div style="padding:14px 18px;border-bottom:1px solid var(--b);display:flex;justify-content:space-between;align-items:center">'
      + '<div><div style="font-size:13px;font-weight:600">Durum Geçmişi</div>'
        + '<div style="font-size:11px;color:var(--t3)">' + (k.from||'?') + ' → ' + (k.to||'?') + ' · ' + (k.firm||'') + '</div>'
      + '</div>'
      + '<button onclick="document.getElementById(\'mo-krg-history\').remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button>'
    + '</div>'
    + '<div style="overflow-y:auto;flex:1;padding:12px 16px">'
    + (h.length === 0
        ? '<div style="text-align:center;color:var(--t3);font-size:12px;padding:20px">Henüz geçmiş kaydı yok</div>'
        : h.map((e,i) => {
            const u = users.find(x=>x.id===e.by)||{name:'Sistem'};
            return '<div style="display:flex;gap:12px;padding:10px 0;' + (i<h.length-1?'border-bottom:1px solid var(--b)':'') + '">'
              + '<div style="font-size:11px;color:var(--t3);font-family:monospace;min-width:110px;padding-top:1px">' + (e.ts||'').slice(0,16) + '</div>'
              + '<div style="flex:1">'
                + '<div style="font-size:12px">'
                  + '<span style="padding:1px 6px;border-radius:3px;background:rgba(163,45,45,.08);color:#A32D2D;font-size:11px">' + (ST_LABELS[e.from]||e.from||'—') + '</span>'
                  + '<span style="margin:0 6px;color:var(--t3)">→</span>'
                  + '<span style="padding:1px 6px;border-radius:3px;background:rgba(59,109,17,.08);color:#3B6D11;font-size:11px">' + (ST_LABELS[e.to]||e.to||'—') + '</span>'
                + '</div>'
                + '<div style="font-size:11px;color:var(--t3);margin-top:2px">' + u.name + '</div>'
              + '</div>'
            + '</div>';
          }).join(''))
    + '</div>'
    + '<div style="padding:11px 16px;border-top:1px solid var(--b);background:var(--s2)">'
      + '<button onclick="document.getElementById(\'mo-krg-history\').remove()" class="btn" style="font-size:12px">Kapat</button>'
    + '</div>'
  + '</div>';

  document.getElementById('mo-krg-history')?.remove();
  document.body.appendChild(mo);
  mo.addEventListener('click', e => { if(e.target===mo) mo.remove(); });
}

// ════════════════════════════════════════════════════════════════
// #5 — TOPLU KONTEYNER GÜNCELLEMESİ
// ════════════════════════════════════════════════════════════════

let _selectedKonts = new Set();

function toggleKonteynSelect(id) {
  if (_selectedKonts.has(id)) _selectedKonts.delete(id);
  else _selectedKonts.add(id);
  _updateBulkBar();
}

function _updateBulkBar() {
  let bar = document.getElementById('konteyn-bulk-bar');
  if (_selectedKonts.size === 0) {
    bar?.remove(); return;
  }
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'konteyn-bulk-bar';
    bar.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:var(--t);color:var(--sf);padding:10px 20px;border-radius:8px;display:flex;align-items:center;gap:12px;z-index:999;font-size:13px;box-shadow:0 4px 20px rgba(0,0,0,.25)';
    document.body.appendChild(bar);
  }
  bar.innerHTML = '<span style="font-weight:500">' + _selectedKonts.size + ' konteyner seçili</span>'
    + '<div style="height:16px;width:1px;background:rgba(255,255,255,.3)"></div>'
    + '<button onclick="bulkKonteynUpdate(\'evrakGon\')"     style="background:rgba(255,255,255,.15);border:none;cursor:pointer;color:inherit;padding:4px 10px;border-radius:5px;font-size:12px;font-family:inherit">Evrak Gönderildi</button>'
    + '<button onclick="bulkKonteynUpdate(\'evrakUlasti\')"  style="background:rgba(255,255,255,.15);border:none;cursor:pointer;color:inherit;padding:4px 10px;border-radius:5px;font-size:12px;font-family:inherit">Müşteri Aldı</button>'
    + '<button onclick="bulkKonteynUpdate(\'inspectionBitti\')" style="background:rgba(255,255,255,.15);border:none;cursor:pointer;color:inherit;padding:4px 10px;border-radius:5px;font-size:12px;font-family:inherit">Inspection</button>'
    + '<button onclick="bulkKonteynUpdate(\'malTeslim\')"    style="background:rgba(255,255,255,.15);border:none;cursor:pointer;color:inherit;padding:4px 10px;border-radius:5px;font-size:12px;font-family:inherit">Mal Teslim</button>'
    + '<button onclick="_selectedKonts.clear();_updateBulkBar();renderKonteyn();" style="background:rgba(255,255,255,.1);border:none;cursor:pointer;color:rgba(255,255,255,.6);padding:4px 8px;border-radius:5px;font-size:12px;font-family:inherit">✕</button>';
}

function bulkKonteynUpdate(key) {
  if (!_selectedKonts.size) return;
  const d     = typeof loadKonteyn==='function' ? loadKonteyn() : [];
  const today = new Date().toISOString().slice(0,10);
  const tsKey = { evrakGon:'evrakTarih', evrakUlasti:'evrakUlastiTarih', inspectionBitti:'inspectionTarih', malTeslim:'malTeslimTarih' };
  let updated = 0;

  d.forEach(k => {
    if (!_selectedKonts.has(k.id)) return;
    if (!k[key]) {
      k[key] = true;
      if (tsKey[key]) k[tsKey[key]] = today;
      if (k.evrakGon && k.evrakUlasti && k.inspectionBitti && k.malTeslim) {
        k.closed = true; k.closedAt = today;
      }
      _logKonteynEvent(k.id, key + ' toplu güncelleme');
      updated++;
    }
  });

  if (typeof storeKonteyn==='function') storeKonteyn(d);
  _selectedKonts.clear();
  document.getElementById('konteyn-bulk-bar')?.remove();
  if (typeof renderKonteyn==='function') renderKonteyn();
  window.toast?.(updated + ' konteyner güncellendi ✓', 'ok');
}

// ════════════════════════════════════════════════════════════════
// #6 — KARGO MASRAF TAKİBİ
// ════════════════════════════════════════════════════════════════

const MASRAF_TURLERI = ['Navlun','Sigorta','Gümrük Vergisi','THC','B/L Ücreti','Demuraj','Antrepo','Diğer'];

function showMasrafModal(konteynId) {
  const konts = typeof loadKonteyn==='function' ? loadKonteyn() : [];
  const k = konts.find(x => x.id === konteynId);
  if (!k) return;
  const masrafData = typeof loadKargoMasraf==='function' ? loadKargoMasraf() : {};
  const masraflar  = masrafData[konteynId] || [];
  const toplam     = masraflar.reduce((s,m) => s + (+m.tutar||0), 0);

  const existing = document.getElementById('mo-masraf');
  existing?.remove();
  const mo = document.createElement('div');
  mo.className = 'mo open'; mo.id = 'mo-masraf'; mo.style.zIndex = '2200';

  const rows = masraflar.map((m,i) =>
    '<tr style="border-bottom:1px solid var(--b)">'
      + '<td style="padding:9px 14px;font-size:12px">' + (m.tur||'—') + '</td>'
      + '<td style="padding:9px 14px;font-size:12px;color:var(--t2)">' + (m.aciklama||'') + '</td>'
      + '<td style="padding:9px 14px;font-size:12px;font-weight:500;text-align:right">' + (m.para||'USD') + ' ' + Number(m.tutar||0).toLocaleString('tr-TR') + '</td>'
      + '<td style="padding:9px 14px;text-align:right"><button onclick="_delMasraf('+konteynId+','+i+')" class="btn btns" style="font-size:11px;padding:2px 8px;color:var(--rdt)">Sil</button></td>'
    + '</tr>'
  ).join('');

  const turOptions = MASRAF_TURLERI.map(t => '<option>' + t + '</option>').join('');

  mo.innerHTML = '<div class="moc" style="max-width:520px;padding:0;border-radius:10px;overflow:hidden;max-height:90vh;display:flex;flex-direction:column">'
    + '<div style="padding:14px 18px;border-bottom:1px solid var(--b);display:flex;justify-content:space-between;align-items:center;flex-shrink:0">'
      + '<div><div style="font-size:14px;font-weight:600">Masraf Takibi</div><div style="font-size:11px;color:var(--t3)">' + k.no + '</div></div>'
      + '<button onclick="document.getElementById(\'mo-masraf\').remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button>'
    + '</div>'

    // Toplam
    + '<div style="padding:12px 18px;border-bottom:1px solid var(--b);background:var(--s2);display:flex;justify-content:space-between;align-items:center;flex-shrink:0">'
      + '<span style="font-size:12px;color:var(--t2)">Toplam Masraf</span>'
      + '<span style="font-size:18px;font-weight:600">' + toplam.toLocaleString('tr-TR') + ' (karma)</span>'
    + '</div>'

    // Liste
    + '<div style="overflow-y:auto;flex:1">'
      + (masraflar.length ? '<table style="width:100%;border-collapse:collapse">'
          + '<thead><tr style="background:var(--s2)"><th style="padding:8px 14px;text-align:left;font-size:10px;color:var(--t3);font-weight:600;text-transform:uppercase">Tür</th><th style="padding:8px 14px;text-align:left;font-size:10px;color:var(--t3);font-weight:600;text-transform:uppercase">Açıklama</th><th style="padding:8px 14px;text-align:right;font-size:10px;color:var(--t3);font-weight:600;text-transform:uppercase">Tutar</th><th></th></tr></thead>'
          + '<tbody>' + rows + '</tbody>'
        + '</table>'
        : '<div style="padding:24px;text-align:center;font-size:12px;color:var(--t3)">Henüz masraf kaydı yok</div>')
    + '</div>'

    // Yeni ekle formu
    + '<div style="padding:14px 18px;border-top:1px solid var(--b);flex-shrink:0">'
      + '<div style="font-size:11px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:10px">Masraf Ekle</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px">'
        + '<select class="fi" id="masraf-tur" style="font-size:12px">' + turOptions + '</select>'
        + '<input class="fi" id="masraf-tutar" type="number" placeholder="Tutar" min="0" style="font-size:12px">'
        + '<select class="fi" id="masraf-para" style="font-size:12px"><option>USD</option><option>EUR</option><option>TRY</option></select>'
      + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr auto;gap:8px">'
        + '<input class="fi" id="masraf-aciklama" placeholder="Açıklama (opsiyonel)" style="font-size:12px">'
        + '<button onclick="_addMasraf(' + konteynId + ')" class="btn btnp" style="font-size:12px">Ekle</button>'
      + '</div>'
    + '</div>'
  + '</div>';

  document.body.appendChild(mo);
  mo.addEventListener('click', e => { if(e.target===mo) mo.remove(); });
}

function _addMasraf(konteynId) {
  const tur    = document.getElementById('masraf-tur')?.value;
  const tutar  = parseFloat(document.getElementById('masraf-tutar')?.value||'0');
  const para   = document.getElementById('masraf-para')?.value||'USD';
  const acik   = document.getElementById('masraf-aciklama')?.value?.trim()||'';
  if (!tutar) { window.toast?.('Tutar zorunludur', 'err'); return; }
  const d = typeof loadKargoMasraf==='function' ? loadKargoMasraf() : {};
  if (!d[konteynId]) d[konteynId] = [];
  d[konteynId].push({ tur, tutar, para, aciklama: acik, ts: typeof nowTs==='function'?nowTs():new Date().toLocaleString('tr-TR') });
  if (typeof storeKargoMasraf==='function') storeKargoMasraf(d);
  window.toast?.('Masraf eklendi ✓', 'ok');
  showMasrafModal(konteynId);
}

function _delMasraf(konteynId, idx) {
  const d = typeof loadKargoMasraf==='function' ? loadKargoMasraf() : {};
  if (d[konteynId]) { d[konteynId].splice(idx, 1); }
  if (typeof storeKargoMasraf==='function') storeKargoMasraf(d);
  showMasrafModal(konteynId);
}

// ════════════════════════════════════════════════════════════════
// #7 — MÜŞTERİ BAZLI LOJİSTİK ÖZETİ
// ════════════════════════════════════════════════════════════════

function getLojistikOzetForMusteri(musteriAdi) {
  const kargo  = typeof loadKargo==='function'   ? loadKargo()   : [];
  const konts  = typeof loadKonteyn==='function' ? loadKonteyn() : [];
  const navlun = typeof loadNavlun==='function'  ? loadNavlun()  : [];

  const mn = (musteriAdi||'').toLowerCase();
  return {
    aktifKargo:      kargo.filter(k => (k.firm||'').toLowerCase().includes(mn) && k.status!=='teslim').length,
    toplamKargo:     kargo.filter(k => (k.firm||'').toLowerCase().includes(mn)).length,
    aktifKonteyn:    konts.filter(k => (k.musteri||'').toLowerCase().includes(mn) && !k.closed).length,
    bekleyenNavlun:  navlun.filter(n => (n.satici||'').toLowerCase().includes(mn) && n.durum==='bekliyor').length,
    onayliNavlun:    navlun.filter(n => (n.satici||'').toLowerCase().includes(mn) && n.durum==='onaylandi').length,
  };
}

function renderLojistikOzetWidget(musteriAdi, containerId) {
  const el  = document.getElementById(containerId);
  if (!el)  return;
  const oz  = getLojistikOzetForMusteri(musteriAdi);
  const any = oz.aktifKargo + oz.aktifKonteyn + oz.bekleyenNavlun;
  if (!any && !oz.toplamKargo) { el.innerHTML = ''; return; }

  el.innerHTML = '<div style="border:1px solid var(--b);border-radius:8px;overflow:hidden;margin-top:12px">'
    + '<div style="padding:10px 14px;border-bottom:1px solid var(--b);font-size:11px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.04em">Lojistik Özeti</div>'
    + '<div style="display:grid;grid-template-columns:repeat(4,1fr)">'
      + _lojOzetStat(oz.aktifKargo,    'Aktif Kargo',     '#185FA5', 0)
      + _lojOzetStat(oz.aktifKonteyn,  'Aktif Konteyner', '#854F0B', 1)
      + _lojOzetStat(oz.bekleyenNavlun,'Bekleyen Teklif', '#854F0B', 2)
      + _lojOzetStat(oz.onayliNavlun,  'Onaylı Navlun',   '#3B6D11', 3)
    + '</div>'
  + '</div>';
}

function _lojOzetStat(v, l, c, i) {
  return '<div style="padding:10px 14px;' + (i<3?'border-right:1px solid var(--b)':'') + '">'
    + '<div style="font-size:18px;font-weight:600;color:' + (v>0?c:'var(--t)') + '">' + v + '</div>'
    + '<div style="font-size:10px;color:var(--t3);margin-top:2px">' + l + '</div>'
  + '</div>';
}

// ════════════════════════════════════════════════════════════════
// #8 — DEMURAJ / DEMURRAGE ALARM
// ════════════════════════════════════════════════════════════════

const DEMURAJ_FREE_DAYS = 7; // Standart serbest gün
const DEMURAJ_DAILY_COST = 150; // USD/gün tahmini

function checkDemuraj() {
  const konts = typeof loadKonteyn==='function' ? loadKonteyn().filter(k=>!k.closed&&k.eta) : [];
  const today = new Date();
  const alarmlar = [];

  konts.forEach(k => {
    const etaDate  = new Date(k.eta);
    const daysSinceEta = Math.ceil((today - etaDate) / 86400000);

    if (daysSinceEta > 0 && !k.malTeslim) {
      const freeDays   = k.freeDays || DEMURAJ_FREE_DAYS;
      const overFree   = daysSinceEta - freeDays;
      const dailyCost  = k.demurajCost || DEMURAJ_DAILY_COST;
      if (overFree > 0) {
        const tahminiMasraf = overFree * dailyCost;
        alarmlar.push({ k, overFree, tahminiMasraf, dailyCost });
        window.addNotif?.('💰', k.no + ': ' + overFree + ' gün demuraj — tahmini $' + tahminiMasraf.toLocaleString(), 'warn', 'kargo');
      }
    }
  });

  return alarmlar;
}

function renderDemurajBanner(containerId) {
  const el  = document.getElementById(containerId);
  if (!el)  return;
  const alarmlar = checkDemuraj();
  if (!alarmlar.length) { el.innerHTML = ''; return; }

  el.innerHTML = '<div style="border:1px solid rgba(133,79,11,.25);border-left:3px solid #854F0B;border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:14px;background:rgba(133,79,11,.04)">'
    + '<div style="font-size:12px;font-weight:600;color:#854F0B;margin-bottom:8px">Demuraj Uyarısı — ' + alarmlar.length + ' konteyner</div>'
    + alarmlar.map(a =>
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-top:1px solid rgba(133,79,11,.1)">'
          + '<div style="font-size:12px"><span style="font-family:monospace;font-weight:600">' + a.k.no + '</span>'
            + ' <span style="color:var(--t2)">— ' + a.overFree + ' gün serbest süre aşımı</span></div>'
          + '<div style="font-size:12px;font-weight:600;color:#854F0B">~$' + a.tahminiMasraf.toLocaleString() + '</div>'
        + '</div>'
      ).join('')
  + '</div>';
}

// ════════════════════════════════════════════════════════════════
// #9 — BELGE YÖNETİMİ
// ════════════════════════════════════════════════════════════════

const BELGE_TURLERI = ['B/L (Konşimento)','Çeki Listesi','Menşei Şahadetnamesi','Sigorta Poliçesi','Proforma Fatura','Gümrük Beyannamesi','Phytosanitary','Diğer'];

function showBelgeModal(konteynId) {
  const konts = typeof loadKonteyn==='function' ? loadKonteyn() : [];
  const k     = konts.find(x => x.id === konteynId);
  if (!k) return;
  const belgeData = typeof loadKargoBelge==='function' ? loadKargoBelge() : {};
  const belgeler  = belgeData[konteynId] || [];

  document.getElementById('mo-belge')?.remove();
  const mo = document.createElement('div');
  mo.className = 'mo open'; mo.id = 'mo-belge'; mo.style.zIndex = '2200';

  const turOptions = BELGE_TURLERI.map(t => '<option>' + t + '</option>').join('');

  mo.innerHTML = '<div class="moc" style="max-width:520px;padding:0;border-radius:10px;overflow:hidden;max-height:90vh;display:flex;flex-direction:column">'
    + '<div style="padding:14px 18px;border-bottom:1px solid var(--b);display:flex;justify-content:space-between;align-items:center;flex-shrink:0">'
      + '<div><div style="font-size:14px;font-weight:600">Belgeler</div><div style="font-size:11px;color:var(--t3)">' + k.no + ' — ' + belgeler.length + ' dosya</div></div>'
      + '<button onclick="document.getElementById(\'mo-belge\').remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button>'
    + '</div>'
    + '<div style="overflow-y:auto;flex:1">'
      + (belgeler.length
          ? belgeler.map((b,i) =>
              '<div style="display:flex;align-items:center;gap:12px;padding:11px 16px;border-bottom:1px solid var(--b)">'
                + '<div style="width:36px;height:36px;border-radius:8px;background:var(--s2);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">'
                  + (b.type?.includes('pdf')?'📄':b.type?.includes('image')?'🖼':'📎') + '</div>'
                + '<div style="flex:1;min-width:0">'
                  + '<div style="font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + b.tur + '</div>'
                  + '<div style="font-size:11px;color:var(--t3)">' + (b.name||'') + ' · ' + (b.ts||'').slice(0,10) + '</div>'
                + '</div>'
                + '<div style="display:flex;gap:4px">'
                  + (b.data ? '<a href="' + b.data + '" download="' + b.name + '" class="btn btns" style="font-size:11px;padding:3px 9px;text-decoration:none">İndir</a>' : '')
                  + '<button onclick="_delBelge(' + konteynId + ',' + i + ')" class="btn btns" style="font-size:11px;padding:3px 8px;color:var(--rdt)">Sil</button>'
                + '</div>'
              + '</div>'
            ).join('')
          : '<div style="padding:24px;text-align:center;font-size:12px;color:var(--t3)">Henüz belge yüklenmemiş</div>')
    + '</div>'
    + '<div style="padding:14px 18px;border-top:1px solid var(--b);flex-shrink:0">'
      + '<div style="font-size:11px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:10px">Belge Yükle</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">'
        + '<select class="fi" id="belge-tur" style="font-size:12px">' + turOptions + '</select>'
        + '<input type="file" id="belge-file" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.docx" style="font-size:12px">'
      + '</div>'
      + '<button onclick="_addBelge(' + konteynId + ')" class="btn btnp" style="font-size:12px;width:100%">Yükle</button>'
    + '</div>'
  + '</div>';

  document.body.appendChild(mo);
  mo.addEventListener('click', e => { if(e.target===mo) mo.remove(); });
}

function _addBelge(konteynId) {
  const tur  = document.getElementById('belge-tur')?.value;
  const file = document.getElementById('belge-file')?.files?.[0];
  if (!file) { window.toast?.('Dosya seçin', 'err'); return; }
  if (file.size > 5242880) { window.toast?.('Dosya 5MB\'dan küçük olmalı', 'err'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    const d = typeof loadKargoBelge==='function' ? loadKargoBelge() : {};
    if (!d[konteynId]) d[konteynId] = [];
    d[konteynId].push({ tur, name: file.name, type: file.type, data: e.target.result,
      ts: typeof nowTs==='function'?nowTs():new Date().toLocaleString('tr-TR') });
    if (typeof storeKargoBelge==='function') storeKargoBelge(d);
    window.toast?.('Belge yüklendi ✓', 'ok');
    showBelgeModal(konteynId);
  };
  reader.readAsDataURL(file);
}

function _delBelge(konteynId, idx) {
  window.confirmModal('Bu belgeyi silmek istediğinizden emin misiniz?', {
    title: 'Belge Sil',
    danger: true,
    confirmText: 'Evet, Sil',
    onConfirm: () => {
      const d = typeof loadKargoBelge==='function' ? loadKargoBelge() : {};
      if (d[konteynId]) d[konteynId].splice(idx, 1);
      if (typeof storeKargoBelge==='function') storeKargoBelge(d);
      showBelgeModal(konteynId);
    }
  });
}

// ════════════════════════════════════════════════════════════════
// #10 — LOJİSTİK PERFORMANS RAPORU
// ════════════════════════════════════════════════════════════════

function showLojPerformansRaporu() {
  const kargo  = typeof loadKargo==='function'   ? loadKargo()   : [];
  const konts  = typeof loadKonteyn==='function' ? loadKonteyn() : [];
  const navlun = typeof loadNavlun==='function'  ? loadNavlun()  : [];
  const today  = new Date();

  // İstatistikler
  const teslimKargo = kargo.filter(k => k.status === 'teslim');
  const aktifKonts  = konts.filter(k => !k.closed);
  const kapaliKonts = konts.filter(k => k.closed);

  // Ortalama transit (kapanan konteynerler)
  const transitSureler = kapaliKonts
    .filter(k => k.etd && k.closedAt)
    .map(k => Math.ceil((new Date(k.closedAt.slice(0,10)) - new Date(k.etd)) / 86400000))
    .filter(d => d > 0 && d < 200);
  const avgTransit = transitSureler.length ? Math.round(transitSureler.reduce((s,d)=>s+d,0)/transitSureler.length) : null;

  // Taşıyıcı sıklığı
  const tasiyanlar = {};
  navlun.forEach(n => { if (n.tasiyan) tasiyanlar[n.tasiyan] = (tasiyanlar[n.tasiyan]||0)+1; });
  const topTasiyan = Object.entries(tasiyanlar).sort((a,b)=>b[1]-a[1]).slice(0,5);

  // Aylık kargo sayısı
  const aylik = {};
  kargo.forEach(k => {
    if (k.date) {
      const ay = k.date.slice(0,7);
      aylik[ay] = (aylik[ay]||0)+1;
    }
  });
  const aylikList = Object.entries(aylik).sort((a,b)=>a[0].localeCompare(b[0])).slice(-6);

  const win = window.open('', '_blank');
  const d = new Date().toLocaleDateString('tr-TR', {day:'2-digit',month:'long',year:'numeric'});

  win.document.write(`<!DOCTYPE html><html lang="tr"><head>
<meta charset="utf-8"><title>Lojistik Performans Raporu — ${d}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'Inter', sans-serif; color: #1E293B; background: #fff; padding: 40px; }
  h1  { font-size: 20px; font-weight: 600; margin-bottom: 4px; }
  .sub{ font-size: 13px; color: #64748B; margin-bottom: 32px; }
  .grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-bottom: 32px; }
  .stat { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; }
  .stat-v { font-size: 28px; font-weight: 600; color: #1E293B; }
  .stat-l { font-size: 11px; color: #64748B; margin-top: 4px; text-transform: uppercase; letter-spacing: .04em; }
  .section { margin-bottom: 32px; }
  .section h2 { font-size: 13px; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 12px; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { padding: 8px 14px; text-align: left; font-size: 10px; color: #64748B; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; background: #F8FAFC; }
  td { padding: 9px 14px; border-bottom: 1px solid #F1F5F9; }
  .bar-wrap { height: 8px; background: #E2E8F0; border-radius: 4px; overflow: hidden; }
  .bar { height: 100%; background: #185FA5; border-radius: 4px; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #E2E8F0; display: flex; justify-content: space-between; font-size: 11px; color: #94A3B8; }
  @media print { @page { margin: 15mm; } }
</style></head><body>
<h1>Lojistik Performans Raporu</h1>
<div class="sub">Oluşturulma: ${d} · ${((window.SIRKET_DATA && window.SIRKET_DATA.unvan_en) || 'Duay Global LLC')} Operasyon Platformu</div>

<div class="grid">
  <div class="stat"><div class="stat-v">${kargo.length}</div><div class="stat-l">Toplam Kargo</div></div>
  <div class="stat"><div class="stat-v">${teslimKargo.length}</div><div class="stat-l">Teslim Edildi</div></div>
  <div class="stat"><div class="stat-v">${konts.length}</div><div class="stat-l">Toplam Konteyner</div></div>
  <div class="stat"><div class="stat-v">${avgTransit ? avgTransit + ' gün' : '—'}</div><div class="stat-l">Ort. Transit Süresi</div></div>
</div>

<div class="section">
  <h2>Aylık Kargo Hareketi (Son 6 Ay)</h2>
  <table>
    <thead><tr><th>Ay</th><th>Kargo Sayısı</th><th>Dağılım</th></tr></thead>
    <tbody>
    ${aylikList.length ? aylikList.map(([ay, sayi]) => {
      const max = Math.max(...aylikList.map(x=>x[1]));
      const pct = Math.round(sayi/max*100);
      return '<tr><td>' + ay + '</td><td>' + sayi + '</td><td style="width:200px"><div class="bar-wrap"><div class="bar" style="width:' + pct + '%"></div></div></td></tr>';
    }).join('') : '<tr><td colspan="3" style="text-align:center;color:#94A3B8">Veri yok</td></tr>'}
    </tbody>
  </table>
</div>

<div class="section">
  <h2>En Sık Çalışılan Taşıyıcılar</h2>
  <table>
    <thead><tr><th>Taşıyıcı</th><th>Teklif Sayısı</th><th>Pay</th></tr></thead>
    <tbody>
    ${topTasiyan.length ? topTasiyan.map(([t,n]) => {
      const total = Object.values(tasiyanlar).reduce((s,v)=>s+v,0);
      return '<tr><td>' + t + '</td><td>' + n + '</td><td>' + Math.round(n/total*100) + '%</td></tr>';
    }).join('') : '<tr><td colspan="3" style="text-align:center;color:#94A3B8">Veri yok</td></tr>'}
    </tbody>
  </table>
</div>

<div class="section">
  <h2>Konteyner Özeti</h2>
  <table>
    <thead><tr><th>Durum</th><th>Adet</th></tr></thead>
    <tbody>
      <tr><td>Aktif</td><td>${aktifKonts.length}</td></tr>
      <tr><td>Tamamlanan</td><td>${kapaliKonts.length}</td></tr>
      <tr><td>Ortalama Transit</td><td>${avgTransit ? avgTransit + ' gün' : '—'}</td></tr>
    </tbody>
  </table>
</div>

<div class="footer">
  <span>${((window.SIRKET_DATA && window.SIRKET_DATA.unvan_en) || 'Duay Global LLC')} — Operasyon Platformu</span>
  <span>${d} tarihinde oluşturulmuştur</span>
</div>
<script>window.onload=()=>window.print();<\/script>
</body></html>`);
  win.document.close();
}

// ════════════════════════════════════════════════════════════════
// EXPORT
// ════════════════════════════════════════════════════════════════

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { showKonteynTimeline, showNavlunKarsilastir, checkDemuraj, showMasrafModal, showBelgeModal };
} else {
  window.showKonteynTimeline    = showKonteynTimeline;
  window.showNavlunKarsilastir  = showNavlunKarsilastir;
  window.startEtaAlarms         = startEtaAlarms;
  window.requestEtaNotifPermission = requestEtaNotifPermission;
  window.showKargoHistory       = showKargoHistory;
  window._logKargoStatus        = _logKargoStatus;
  window._logKonteynEvent       = _logKonteynEvent;
  window.toggleKonteynSelect    = toggleKonteynSelect;
  window.bulkKonteynUpdate      = bulkKonteynUpdate;
  window.showMasrafModal        = showMasrafModal;
  window.renderLojistikOzetWidget = renderLojistikOzetWidget;
  window.getLojistikOzetForMusteri = getLojistikOzetForMusteri;
  window.renderDemurajBanner    = renderDemurajBanner;
  window.checkDemuraj           = checkDemuraj;
  window.showBelgeModal         = showBelgeModal;
  window.showLojPerformansRaporu = showLojPerformansRaporu;
}
