/**
 * ═══════════════════════════════════════════════════════════════
 * src/modules/lojistik.js  —  v2.0.0
 * Lojistik Hub — Ana Lojistik Dashboard (Onay 4)
 * ═══════════════════════════════════════════════════════════════
 */
'use strict';

function renderLojistik() {
  const panel = document.getElementById('panel-lojistik');
  if (!panel) return;

  const kargo   = typeof loadKargo   === 'function' ? loadKargo()   : [];
  const konts   = typeof loadKonteyn === 'function' ? loadKonteyn() : [];
  const users   = typeof loadUsers   === 'function' ? loadUsers()   : [];
  const today   = new Date();
  const todayS  = today.toISOString().slice(0, 10);
  const cu      = window.Auth?.getCU?.();

  // ── İstatistikler ──────────────────────────────────────────────
  const kargoTotal   = kargo.length;
  const kargoBekle   = kargo.filter(k => k.status === 'bekle').length;
  const kargoYolda   = kargo.filter(k => k.status === 'yolda').length;
  const kargoTeslim  = kargo.filter(k => k.status === 'teslim').length;
  const kargoGecikmiş = kargo.filter(k => k.status !== 'teslim' && k.date && k.date < todayS).length;
  const kontsAktif   = konts.filter(k => !k.closed).length;
  const kontsKapali  = konts.filter(k => k.closed).length;
  const kontsAlarm   = konts.filter(k => {
    if (k.closed) return false;
    const etaD = k.eta ? new Date(k.eta) : null;
    const dl   = etaD ? Math.ceil((etaD - today) / 86400000) : null;
    return dl !== null && dl <= 7;
  }).length;

  // ── Yaklaşan ETA ───────────────────────────────────────────────
  const yaklaşanKonts = konts
    .filter(k => !k.closed && k.eta)
    .map(k => {
      const etaD = new Date(k.eta);
      const dl   = Math.ceil((etaD - today) / 86400000);
      return { ...k, daysLeft: dl };
    })
    .filter(k => k.daysLeft <= 14)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5);

  // ── Son kargolar ───────────────────────────────────────────────
  const sonKargolar = [...kargo]
    .sort((a, b) => (b.id || 0) - (a.id || 0))
    .slice(0, 5);

  // ── Eksik adımlar (alarm) ──────────────────────────────────────
  const eksikAdimlar = konts.filter(k => !k.closed && (
    (!k.evrakGon && k.eta && Math.ceil((new Date(k.eta) - today) / 86400000) <= 10) ||
    (k.evrakGon && !k.evrakUlasti) ||
    (k.evrakUlasti && !k.inspectionBitti) ||
    (k.inspectionBitti && !k.malTeslim)
  )).slice(0, 4);

  panel.innerHTML = [

    // ── Header ──────────────────────────────────────────────────
    '<div class="ph">',
      '<div>',
        '<div class="pht">🚢 Lojistik Merkezi</div>',
        '<div class="phs">Kargo ve konteyner operasyonlarına genel bakış</div>',
      '</div>',
      '<div style="display:flex;gap:8px;flex-wrap:wrap">',
        '<button class="btn btns" onclick="App?.nav?.(\'kargo\',null)" style="border-radius:9px;font-size:12px">📦 Kargo Yönetimi →</button>',
        '<button class="btn btnp" onclick="openKonteynModal(null)" style="border-radius:9px;font-size:12px">+ Konteyner Ekle</button>',
      '</div>',
    '</div>',

    // ── Ana İstatistik Kartları ──────────────────────────────────
    '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">',

      _lojStat('📦', kargoTotal,   'Toplam Kargo',      'var(--al)',                  'rgba(99,102,241,.15)',  'var(--ac)'),
      _lojStat('🚛', kargoYolda,   'Yolda',             'rgba(59,130,246,.08)',       'rgba(59,130,246,.2)',   '#3B82F6'),
      _lojStat('⏳', kargoBekle,   'Beklemede',         'rgba(245,158,11,.08)',       'rgba(245,158,11,.2)',   '#D97706'),
      _lojStat('✅', kargoTeslim,  'Teslim Edildi',     'rgba(34,197,94,.08)',        'rgba(34,197,94,.2)',    '#16A34A'),

    '</div>',

    // ── İkinci istatistik satırı ─────────────────────────────────
    '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">',

      _lojStat('🚢', kontsAktif,   'Aktif Konteyner',   'rgba(139,92,246,.08)',       'rgba(139,92,246,.2)',   '#8B5CF6'),
      _lojStat('⚠️', kontsAlarm,   'ETA Alarm (7 gün)', 'rgba(239,68,68,.06)',         'rgba(239,68,68,.2)',    '#EF4444'),
      _lojStat('✅', kontsKapali,  'Tamamlanan',        'rgba(34,197,94,.08)',        'rgba(34,197,94,.2)',    '#16A34A'),
      _lojStat('🔴', kargoGecikmiş,'Gecikmiş Kargo',    'rgba(239,68,68,.06)',         'rgba(239,68,68,.2)',    '#EF4444'),

    '</div>',

    // ── Alarm Banner ─────────────────────────────────────────────
    eksikAdimlar.length ? [
      '<div style="background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.2);border-left:4px solid #EF4444;border-radius:12px;padding:14px 16px;margin-bottom:18px">',
        '<div style="font-size:12px;font-weight:700;color:#DC2626;margin-bottom:10px">🚨 ' + eksikAdimlar.length + ' Konteyner Dikkat Gerektiriyor</div>',
        eksikAdimlar.map(k => {
          const eksik = !k.evrakGon ? '📄 Evrak gönderilmedi'
            : !k.evrakUlasti    ? '📬 Müşteri evrak teslim almadı'
            : !k.inspectionBitti? '🔍 Inspection bekleniyor'
            : '📦 Mal teslimi bekleniyor';
          const etaD = k.eta ? new Date(k.eta) : null;
          const dl   = etaD ? Math.ceil((etaD - today) / 86400000) : null;
          return '<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(239,68,68,.1)">'
            + '<div style="font-size:12px;color:#DC2626"><strong style="font-family:monospace">' + k.no + '</strong> — ' + eksik + '</div>'
            + '<div style="display:flex;align-items:center;gap:8px">'
              + (dl !== null ? '<span style="font-size:11px;font-weight:700;color:' + (dl<=3?'#DC2626':'#D97706') + '">' + (dl<=0?'ETA Geçti':''+dl+' gün') + '</span>' : '')
              + '<button onclick="openKonteynDetail(' + k.id + ')" style="background:none;border:1px solid rgba(239,68,68,.3);border-radius:6px;cursor:pointer;font-size:11px;color:#DC2626;padding:2px 8px">Detay →</button>'
            + '</div>'
          + '</div>';
        }).join(''),
      '</div>',
    ].join('') : '',

    // ── Ana Grid ─────────────────────────────────────────────────
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px">',

      // Sol: Yaklaşan ETA
      '<div class="card">',
        '<div class="ch">',
          '<span class="ct">⏰ Yaklaşan ETA (14 Gün)</span>',
          '<button class="btn btns" onclick="App?.nav?.(\'kargo\',null)" style="font-size:11px">Tümü →</button>',
        '</div>',
        yaklaşanKonts.length
          ? '<div style="padding:4px 0">' + yaklaşanKonts.map(k => {
              const u   = users.find(x => x.id === k.uid) || { name: '?' };
              const isU = k.daysLeft <= 0;
              const isA = !isU && k.daysLeft <= 5;
              return '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:1px solid var(--b)">'
                + '<div style="display:flex;align-items:center;gap:10px">'
                  + '<div style="width:34px;height:34px;border-radius:9px;background:' + (isU?'rgba(239,68,68,.1)':isA?'rgba(245,158,11,.1)':'rgba(99,102,241,.1)') + ';display:flex;align-items:center;justify-content:center;font-size:16px">🚢</div>'
                  + '<div>'
                    + '<div style="font-size:13px;font-weight:700;font-family:monospace">' + k.no + '</div>'
                    + '<div style="font-size:10px;color:var(--t3)">' + (k.hat||'—') + ' · ' + u.name + '</div>'
                  + '</div>'
                + '</div>'
                + '<div style="text-align:right">'
                  + '<div style="font-size:13px;font-weight:700;color:' + (isU?'#DC2626':isA?'#D97706':'var(--ac)') + '">' + (isU ? 'ETA Geçti' : k.daysLeft + ' gün') + '</div>'
                  + '<div style="font-size:10px;color:var(--t3);font-family:monospace">' + (k.eta||'') + '</div>'
                + '</div>'
              + '</div>';
            }).join('') + '</div>'
          : '<div style="padding:24px;text-align:center;color:var(--t3);font-size:12px">Yaklaşan ETA yok</div>',
      '</div>',

      // Sağ: Son Kargolar
      '<div class="card">',
        '<div class="ch">',
          '<span class="ct">📦 Son Kargo Hareketleri</span>',
          '<button class="btn btns" onclick="App?.nav?.(\'kargo\',null)" style="font-size:11px">Tümü →</button>',
        '</div>',
        sonKargolar.length
          ? '<div style="padding:4px 0">' + sonKargolar.map(k => {
              const st2 = { bekle:{c:'#D97706',b:'rgba(245,158,11,.1)',ic:'⏳'}, yolda:{c:'#3B82F6',b:'rgba(59,130,246,.1)',ic:'🚛'}, teslim:{c:'#16A34A',b:'rgba(34,197,94,.1)',ic:'✅'}, iade:{c:'#EF4444',b:'rgba(239,68,68,.1)',ic:'↩️'} }[k.status] || {c:'var(--t2)',b:'var(--s2)',ic:'📦'};
              return '<div style="display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid var(--b)">'
                + '<div style="width:34px;height:34px;border-radius:9px;background:' + st2.b + ';display:flex;align-items:center;justify-content:center;font-size:16px">' + (k.dir==='gelen'?'📥':'📤') + '</div>'
                + '<div style="flex:1;min-width:0">'
                  + '<div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (k.from||'—') + ' → ' + (k.to||'—') + '</div>'
                  + '<div style="font-size:10px;color:var(--t3)">' + (k.firm||'—') + ' · ' + (k.date||'') + '</div>'
                + '</div>'
                + '<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:6px;background:' + st2.b + ';color:' + st2.c + ';white-space:nowrap">' + st2.ic + ' ' + (k.status==='bekle'?'Bekl.':k.status==='yolda'?'Yolda':k.status==='teslim'?'Teslim':'İade') + '</span>'
              + '</div>';
            }).join('') + '</div>'
          : '<div style="padding:24px;text-align:center;color:var(--t3);font-size:12px">Kargo kaydı bulunamadı</div>',
      '</div>',

    '</div>',

    // ── Konteyner Durum Özeti ────────────────────────────────────
    konts.length ? [
      '<div class="card" style="margin-bottom:18px">',
        '<div class="ch">',
          '<span class="ct">🚢 Konteyner Durumu</span>',
          '<button class="btn btns" onclick="App?.nav?.(\'kargo\',null)" style="font-size:11px">Tüm Konteynerler →</button>',
        '</div>',
        '<div style="padding:8px 16px 14px">',
          '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">',
            konts.filter(k => !k.closed).slice(0,6).map(k => {
              const etaD  = k.eta ? new Date(k.eta) : null;
              const dl    = etaD ? Math.ceil((etaD - today) / 86400000) : null;
              const isU   = dl !== null && dl <= 0;
              const isA   = dl !== null && dl > 0 && dl <= 5;
              const steps = [k.evrakGon, k.evrakUlasti, k.inspectionBitti, k.malTeslim].filter(Boolean).length;
              const pct   = Math.round(steps / 4 * 100);
              return '<div style="background:var(--s2);border-radius:10px;padding:10px 12px;border:1px solid ' + (isU?'rgba(239,68,68,.3)':isA?'rgba(245,158,11,.3)':'var(--b)') + '">'
                + '<div style="display:flex;justify-content:space-between;margin-bottom:6px">'
                  + '<div style="font-size:12px;font-weight:800;font-family:monospace;color:' + (isU?'#DC2626':isA?'#D97706':'var(--t)') + '">' + k.no + '</div>'
                  + '<div style="font-size:11px;font-weight:700;color:' + (pct===100?'#22C55E':'var(--ac)') + '">' + pct + '%</div>'
                + '</div>'
                + '<div style="height:4px;background:var(--b);border-radius:99px;overflow:hidden;margin-bottom:6px">'
                  + '<div style="height:100%;background:' + (pct===100?'#22C55E':'linear-gradient(90deg,#6366F1,#8B5CF6)') + ';width:' + pct + '%;border-radius:99px;transition:width .4s"></div>'
                + '</div>'
                + '<div style="font-size:10px;color:var(--t3)">'
                  + (k.hat ? k.hat + ' · ' : '')
                  + (k.eta ? 'ETA: ' + k.eta : '')
                + '</div>'
              + '</div>';
            }).join(''),
          '</div>',
          konts.filter(k => !k.closed).length > 6
            ? '<div style="text-align:center;margin-top:12px"><button class="btn btns" onclick="App?.nav?.(\'kargo\',null)" style="font-size:11px">+ ' + (konts.filter(k=>!k.closed).length-6) + ' konteyner daha →</button></div>'
            : '',
        '</div>',
      '</div>',
    ].join('') : '',

    // ── Hızlı Erişim ─────────────────────────────────────────────
    '<div class="card">',
      '<div class="ch"><span class="ct">⚡ Hızlı İşlemler</span></div>',
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:14px">',
        _lojQuick('📥', 'Gelen Kargo', "openKargoModal('gelen')"),
        _lojQuick('📤', 'Giden Kargo', "openKargoModal('giden')"),
        _lojQuick('🚢', 'Konteyner Ekle', 'openKonteynModal(null)'),
        _lojQuick('↻',  'Kontrol Et', 'checkAllKonteyn()'),
        _lojQuick('⬇', 'Excel İndir', 'exportKargoXlsx()'),
        _lojQuick('↑',  'Excel Yükle', 'importKargoFile()'),
        _lojQuick('🖨', 'PDF Rapor', 'printKargoRapor()'),
        _lojQuick('📦', 'Tüm Kargolar', "App?.nav?.('kargo',null)"),
      '</div>',
    '</div>',

  ].join('');
}

function _lojStat(icon, val, label, bg, borderColor, textColor) {
  return '<div style="background:' + bg + ';border:1px solid ' + borderColor + ';border-radius:14px;padding:16px;display:flex;align-items:center;gap:12px">'
    + '<div style="width:40px;height:40px;border-radius:11px;background:' + borderColor + ';display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">' + icon + '</div>'
    + '<div>'
      + '<div style="font-size:24px;font-weight:700;color:' + textColor + ';line-height:1">' + val + '</div>'
      + '<div style="font-size:11px;color:var(--t3);margin-top:3px">' + label + '</div>'
    + '</div>'
  + '</div>';
}

function _lojQuick(icon, label, onclick) {
  return '<div class="qi" onclick="' + onclick + '" style="flex-direction:column;gap:5px;padding:12px 8px;cursor:pointer">'
    + '<div style="font-size:22px">' + icon + '</div>'
    + '<div style="font-size:11px;font-weight:600;text-align:center;color:var(--t2)">' + label + '</div>'
  + '</div>';
}

// ── Export ───────────────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderLojistik };
} else {
  window.renderLojistik = renderLojistik;
}
