/**
 * src/modules/lojistik.js  —  v5.0  Komuta Merkezi
 * LOJISTIK-KOMUTA-UI-001: 10 metric (pastel renkli) + 4 mini özet + 5 üst buton + alarm
 */
'use strict';

/* V190a — KX10 helper: Geciken kayıt sayısı tek kaynak.
 * V189d algoritması (TEDARIK/URETIM/YOLDA/GUMRUKTE/... + GECIKTI dahil,
 * KONTEYNIRA_YUKLENDI/TESLIM_ALINDI/MUSTERI_TESLIM_ALDI hariç).
 * Hem 3 KPI bloğu hem Kart 7 bu helper'dan okur — duplicate logic yok. */
function _lojGecikenSay(edActive) {
  if (!Array.isArray(edActive)) return 0;
  const now = new Date();
  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const COMPLETED = ['KONTEYNIRA_YUKLENDI', 'TESLIM_ALINDI', 'MUSTERI_TESLIM_ALDI'];
  return edActive.filter(function(d) {
    if (!d) return false;
    if (COMPLETED.indexOf(d.status) >= 0) return false;
    if (d.status === 'GECIKTI') return true;
    if (!d.estimatedDeliveryDate) return false;
    return new Date(d.estimatedDeliveryDate) < today0;
  }).length;
}
if (typeof window !== 'undefined' && !window._lojGecikenSay) window._lojGecikenSay = _lojGecikenSay;

function renderLojistik() {
  const panel = document.getElementById('panel-lojistik');
  if (!panel) return;

  const kargo  = typeof loadKargo   === 'function' ? loadKargo()   : [];
  const konts  = typeof loadKonteyn === 'function' ? loadKonteyn() : [];
  const users  = typeof loadUsers   === 'function' ? loadUsers()   : [];
  const ed     = typeof window.loadExpectedDeliveries === 'function' ? (window.loadExpectedDeliveries({ raw: true }) || []) : [];
  const eksikHasar = typeof window.loadEksikHasar === 'function' ? (window.loadEksikHasar() || []) : [];
  const today  = new Date();

  const B = 'border:1px solid var(--b)';
  const Bh = 'border-bottom:1px solid var(--b)';
  const Br = 'border-right:1px solid var(--b)';
  const card = `background:var(--sf);${B};border-radius:8px;overflow:hidden`;
  const mono = "font-family:'DM Mono',monospace";
  const t2 = 'color:var(--t2)';
  const t3 = 'color:var(--t3)';

  /* ST renkleri (badge için) — gelecek widget'larda kullanılabilir, korundu */
  const ST = {
    bekle:  { l:'Beklemede', bg:'rgba(133,79,11,.09)',  c:'#854F0B' },
    yolda:  { l:'Yolda',     bg:'rgba(24,95,165,.09)',  c:'#185FA5' },
    teslim: { l:'Teslim',    bg:'rgba(59,109,17,.09)',  c:'#3B6D11' },
    iade:   { l:'İade',      bg:'rgba(163,45,45,.09)',  c:'#A32D2D' },
  };

  /* LOJISTIK-KOMUTA-UI-001: ED status sayımları + konteynır + alarm */
  const edActive = ed.filter(d => d && !d.isDeleted);
  const edByStatus = (s) => edActive.filter(d => d.status === s).length;
  const yoldakiCount = edActive.filter(d => d.status === 'YOLDA' || d.status === 'GUMRUKTE').length;

  const alarms = konts.filter(k => {
    if (k.closed || !k.eta) return false;
    const dl = Math.ceil((new Date(k.eta) - today) / 86400000);
    return dl <= 10 && (!k.evrakGon || !k.evrakUlasti || !k.inspectionBitti || !k.malTeslim);
  }).slice(0, 3);

  /* LOJISTIK-KOMUTA-UI-001: 10 metric pastel renk paleti */
  const metricColors = [
    { bg: 'var(--s2)', fg: 'var(--t)' },   // Toplam
    { bg: '#FAEEDA',   fg: '#854F0B' },    // Tedarik
    { bg: '#FBEAF0',   fg: '#72243E' },    // Üretim
    { bg: '#E6F1FB',   fg: '#0C447C' },    // Yolda
    { bg: '#EEEDFE',   fg: '#3C3489' },    // Depoda
    { bg: '#FAECE7',   fg: '#712B13' },    // Sırada
    { bg: '#EAF3DE',   fg: '#27500A' },    // Yüklü
    { bg: '#FCEBEB',   fg: '#791F1F' },    // Gecikti
    { bg: '#E1F5EE',   fg: '#085041' },    // Konteynır
    { bg: '#F1EFE8',   fg: 'var(--t2)' },  // Yolda+Gümrük
  ];

  const metrics = [
    { v: edActive.length,                  l: 'Toplam'      },
    { v: edByStatus('TEDARIK_ASAMASINDA'), l: 'Tedarik'     },
    { v: edByStatus('URETIMDE'),           l: 'Üretim'      },
    { v: edByStatus('YOLDA'),              l: 'Yolda'       },
    { v: edByStatus('DEPODA'),             l: 'Depoda'      },
    { v: edByStatus('YUKLEME_BEKLIYOR'),   l: 'Sırada'      },
    { v: edByStatus('TESLIM_ALINDI'),      l: 'Yüklü'       },
    { v: edByStatus('GECIKTI'),            l: 'Gecikti'     },
    { v: konts.filter(k => k && !k.isDeleted && !k.kapanmis && !k.closed).length, l: 'Konteynır' },
    { v: yoldakiCount > 0 ? yoldakiCount : '—', l: 'Yolda+Gümrük' },
  ];

  /* LOJISTIK-KOMUTA-UI-001: 4 mini özet kart (Aktif Konteynir / Bu Hafta / Eksik-Hasar / Foto) */
  const aktifKonteynir = konts.find(k => k && !k.isDeleted && !k.kapanmis && !k.closed);
  const aktifKonteynirHTML = aktifKonteynir ? (() => {
    const tip = aktifKonteynir.tip || aktifKonteynir.konteynırTipi || '—';
    const kapasite = typeof window._konteynirKapasiteDefault === 'function' ? window._konteynirKapasiteDefault(tip) : 33;
    const dolu = (aktifKonteynir.yuklemePlani || []).reduce((s, p) => s + (parseFloat(p && p.m3) || 0), 0);
    const pct = kapasite > 0 ? Math.min(100, Math.round((dolu / kapasite) * 100)) : 0;
    const eta = aktifKonteynir.eta || aktifKonteynir.ETAMuhur || '—';
    const kod = aktifKonteynir.no || aktifKonteynir.konteynırNo || ('#' + (aktifKonteynir.id || ''));
    return `<div style="font-size:13px;font-weight:500;${mono};margin-bottom:6px">${kod} <span style="font-size:11px;${t3};font-weight:400">· ${tip}</span></div>
      <div style="height:4px;background:var(--s2);border-radius:2px;overflow:hidden;margin-bottom:6px"><div style="height:100%;width:${pct}%;background:${pct >= 100 ? '#3B6D11' : '#185FA5'};border-radius:2px"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:11px;${t3}"><span>${pct}% dolu</span><span>ETA ${eta}</span></div>`;
  })() : `<div style="font-size:12px;${t3};text-align:center;padding:10px 0">Aktif konteynır yok</div>`;

  const haftaOnce = today.getTime() - 7 * 86400000;
  const buHaftaED = edActive.filter(d => {
    const ts = d.createdAt ? new Date(d.createdAt).getTime() : 0;
    return ts >= haftaOnce;
  });
  const buHaftaPaket = buHaftaED.reduce((s, d) => s + (parseFloat(d.paketSayisi) || 0), 0);
  const buHaftaM3 = buHaftaED.reduce((s, d) => s + (parseFloat(d.m3) || 0), 0);
  const buHaftaHTML = `<div style="font-size:18px;font-weight:600;color:var(--t);margin-bottom:4px">${buHaftaED.length} <span style="font-size:11px;${t3};font-weight:400">teslimat</span></div>
    <div style="font-size:11px;${t3}">${buHaftaPaket > 0 ? buHaftaPaket + ' paket · ' : ''}${buHaftaM3 > 0 ? buHaftaM3.toFixed(1) + ' m³' : (buHaftaPaket > 0 ? '' : 'paket/m³ verisi yok')}</div>`;

  const acikEksikHasar = eksikHasar.filter(eh => eh && !eh.isDeleted && eh.durum === 'acik');
  const eksikHasarHTML = acikEksikHasar.length ? `<div style="font-size:18px;font-weight:600;color:#A32D2D;margin-bottom:4px">${acikEksikHasar.length} <span style="font-size:11px;${t3};font-weight:400">açık kayıt</span></div>
    ${acikEksikHasar.slice(0, 2).map(eh => `<div style="font-size:11px;${t3};margin-top:3px">• ${(eh.tip || '—')} · ${String(eh.aciklama || '').slice(0, 32)}${String(eh.aciklama || '').length > 32 ? '…' : ''}</div>`).join('')}`
    : `<div style="font-size:12px;${t3};text-align:center;padding:10px 0">Açık eksik/hasar yok</div>`;

  const fotoHTML = `<div style="font-size:12px;${t3};text-align:center;padding:10px 0">Foto sistemi V119'da aktif olur</div>`;

  panel.innerHTML = [

    /* LOJISTIK-KOMUTA-UI-001: Header + 5 üst buton */
    `<div class="ph" style="${Bh};margin-bottom:0">
      <div>
        <div class="pht">Lojistik Komuta Merkezi</div>
        <div class="phs">${edActive.length} aktif teslimat</div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <!-- V189c — Üst Excel + PDF butonları kaldırıldı:
             window._lojistikXlsx ve window._lojistikPdf hiçbir yerde tanımlı değildi
             (silent fail). ED listesindeki V187g/h/i export butonları korundu. -->
        <!-- V190e — '+ Konteynır' butonu kaldırıldı: Kargo paneline taşındı.
             window.openKonteynModal başka yerde çağrılıyor, fonksiyon korundu. -->
        <button class="btn btns" onclick="window.nav?.('kargo')" style="font-size:12px">Kargo Yönetimi</button>
        <button class="btn btnp" onclick="window._edWizardAc?.()" style="font-size:12px">+ Yeni Teslimat</button>
      </div>
    </div>`,

    /* V190a — Apple style: 10 metric şeridi → 3 büyük KPI + disclosure (7 alt-metric).
     * Hiçbir veri kaybı: tüm metrikler ya 3 KPI'da ya disclosure içinde.
     * 3 KPI: Toplam · Yolda · Geciken (kullanıcı kararı). */
    `<div style="background:var(--sf);${B};border-top:none;border-radius:0 0 8px 8px;margin-bottom:16px;overflow:hidden">
      <!-- 3 BÜYÜK KPI -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);border-bottom:0.5px solid var(--b)">
        ${(() => {
          const kpiToplam   = edActive.length;
          const kpiYolda    = edByStatus('YOLDA');
          /* V190a — KX10: helper'dan al (renderLojistik üstünde tanımlı) */
          const kpiGeciken  = _lojGecikenSay(edActive);
          const gecikenColor = kpiGeciken > 0 ? '#A32D2D' : 'var(--t)';
          const kpis = [
            { v: kpiToplam,   l: 'Toplam',   c: 'var(--t)' },
            { v: kpiYolda,    l: 'Yolda',    c: 'var(--t)' },
            { v: kpiGeciken,  l: 'Geciken',  c: gecikenColor }
          ];
          return kpis.map((k,i)=>`<div style="padding:24px 16px;text-align:center;${i<2?Br:''}">
            <div style="font-size:36px;font-weight:600;color:${k.c};line-height:1;letter-spacing:-0.02em">${k.v}</div>
            <div style="font-size:11px;color:var(--t3);margin-top:6px;text-transform:uppercase;letter-spacing:.06em;font-weight:500">${k.l}</div>
          </div>`).join('');
        })()}
      </div>
      <!-- DISCLOSURE: 7 alt-metric (default kapalı) -->
      <details style="border-top:0.5px solid transparent">
        <summary style="padding:10px 16px;font-size:11px;color:var(--t3);cursor:pointer;list-style:none;user-select:none;display:flex;align-items:center;gap:6px" onmouseenter="this.style.background='var(--s2)'" onmouseleave="this.style.background='transparent'">
          <span style="font-size:9px">▾</span> Tüm metriklere bak
        </summary>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);padding:0 0 4px;border-top:0.5px solid var(--b)">
          ${(() => {
            const sub = [
              { v: edByStatus('TEDARIK_ASAMASINDA'), l: 'Tedarik' },
              { v: edByStatus('URETIMDE'),           l: 'Üretim'  },
              { v: edByStatus('DEPODA'),             l: 'Depoda'  },
              { v: edByStatus('YUKLEME_BEKLIYOR'),   l: 'Sırada'  },
              { v: edByStatus('TESLIM_ALINDI'),      l: 'Yüklü'   },
              { v: konts.filter(k => k && !k.isDeleted && !k.kapanmis && !k.closed).length, l: 'Konteynır' },
              { v: yoldakiCount > 0 ? yoldakiCount : '—', l: 'Yolda+Gümrük' }
            ];
            return sub.map((m,i)=>`<div style="padding:12px 8px;text-align:center;${i<6?Br:''}">
              <div style="font-size:18px;font-weight:600;color:var(--t);line-height:1">${m.v}</div>
              <div style="font-size:10px;color:var(--t3);margin-top:3px;letter-spacing:.02em">${m.l}</div>
            </div>`).join('');
          })()}
        </div>
      </details>
    </div>`,

    /* Demuraj banner — korundu */
    (typeof renderDemurajBanner === 'function' ? (() => { renderDemurajBanner('konteyn-demuraj-bar'); return ''; })() : ''),

    /* V190a — Apple style: 12 mini kart (3 sıra × 4) → tek satır özet.
     * Bilgi kaybı sıfır:
     *   Satır 1 (her zaman): kg · m³ · konteyner öneri · sorumlu/satıcı
     *   Satır 2 (koşullu):   bu hafta · eksik-hasar · zorunlu bekleyen · taşıma işareti
     * KALDIRILDI: Aktif Konteynır (V190d'de grup başlığında) + Foto Bu Ay (dead promise) */
    `<div style="background:var(--sf);${B};border-radius:8px;padding:14px 18px;margin-bottom:16px">
      ${(() => {
        const totalKg = edActive.reduce((s, d) => s + (parseFloat(d.weightKg) || 0), 0);
        const totalM3 = edActive.reduce((s, d) => s + (parseFloat(d.volumeM3) || 0), 0);
        const sorumluCount = new Set(edActive.map(d => d.responsibleUserId).filter(Boolean)).size;
        const tedarikciCount = new Set(edActive.map(d => d.supplierId).filter(Boolean)).size;
        const calc = (typeof window._edCalculateContainers === 'function')
          ? window._edCalculateContainers({ weightKg: totalKg, volumeM3: totalM3 })
          : null;
        const oncelikliBekleyen = edActive.filter(d =>
          d.loadingPriority === 'REQUIRED' && d.status !== 'TESLIM_ALINDI'
        ).length;
        const flagCount = {};
        edActive.forEach(d => {
          (Array.isArray(d.handlingFlags) ? d.handlingFlags : []).forEach(f => {
            flagCount[f] = (flagCount[f] || 0) + 1;
          });
        });
        const flagsTotal = Object.values(flagCount).reduce((s, n) => s + n, 0);
        const top3 = Object.keys(flagCount).map(k => [k, flagCount[k]]).sort((a, b) => b[1] - a[1]).slice(0, 3);
        const emojiMap = window.HANDLING_FLAGS_EMOJI || {};
        const top3Emoji = top3.length ? top3.map(arr => emojiMap[arr[0]] || '').filter(Boolean).join('') : '';

        /* Satır 1 — her zaman görünür */
        const line1Parts = [];
        if (totalKg > 0) line1Parts.push('<strong style="color:var(--t);font-weight:600">' + Math.round(totalKg).toLocaleString('tr-TR') + '</strong> kg');
        if (totalM3 > 0) line1Parts.push('<strong style="color:var(--t);font-weight:600">' + totalM3.toFixed(1) + '</strong> m³');
        if (calc) line1Parts.push('<strong style="color:' + calc.color + ';font-weight:600">' + calc.count + '×' + calc.type + '</strong> öneri');
        if (sorumluCount > 0) line1Parts.push('<strong style="color:var(--t);font-weight:600">' + sorumluCount + '</strong> sorumlu');
        if (tedarikciCount > 0) line1Parts.push('<strong style="color:var(--t);font-weight:600">' + tedarikciCount + '</strong> satıcı');
        const line1 = line1Parts.length
          ? line1Parts.join(' <span style="color:var(--t3);margin:0 4px">·</span> ')
          : '<span style="color:var(--t3)">Henüz veri yok</span>';

        /* Satır 2 — koşullu (en az 1 öğe varsa görünür) */
        const line2Parts = [];
        if (acikEksikHasar.length > 0) line2Parts.push('<span style="color:#A32D2D">⚠ ' + acikEksikHasar.length + ' açık eksik/hasar</span>');
        if (buHaftaED.length > 0) line2Parts.push('📅 ' + buHaftaED.length + ' bu hafta');
        if (oncelikliBekleyen > 0) line2Parts.push('<span style="color:#854F0B">⭐ ' + oncelikliBekleyen + ' zorunlu bekleyen</span>');
        if (top3Emoji && flagsTotal > 0) line2Parts.push(top3Emoji + ' ' + flagsTotal + ' taşıma işareti');
        const line2 = line2Parts.length
          ? line2Parts.join(' <span style="color:var(--t3);margin:0 4px">·</span> ')
          : '';

        return '<div style="font-size:13px;color:var(--t);line-height:1.5;letter-spacing:-0.005em">' + line1 + '</div>'
             + (line2 ? '<div style="font-size:12px;color:var(--t2);margin-top:6px;line-height:1.5">' + line2 + '</div>' : '');
      })()}
    </div>`,


    /* LOJISTIK-KOMUTA-UI-001: Alarm bloğu geri eklendi (eski koddan korundu) */
    alarms.length ? `<div style="border:1px solid rgba(163,45,45,.2);border-left:3px solid #A32D2D;border-radius:0 6px 6px 0;padding:11px 14px;margin-bottom:16px;background:rgba(163,45,45,.03)">
      <div style="font-size:12px;font-weight:600;color:#A32D2D;margin-bottom:7px">${alarms.length} konteynır işlem bekliyor</div>
      ${alarms.map(k => {
        const dl = Math.ceil((new Date(k.eta) - today) / 86400000);
        const eksik = !k.evrakGon ? 'Evrak gönderilmedi' : !k.evrakUlasti ? 'Müşteri evrak almadı' : !k.inspectionBitti ? 'Inspection bekleniyor' : 'Mal teslimi bekleniyor';
        return `<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-top:1px solid rgba(163,45,45,.08)">
          <div style="font-size:12px"><span style="${mono};font-weight:600">${k.no}</span> <span style="${t2}">— ${eksik}</span></div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:11px;font-weight:600;color:${dl <= 3 ? '#A32D2D' : '#854F0B'}">${dl <= 0 ? 'ETA geçti' : dl + ' gün'}</span>
            <button onclick="window.openKonteynDetail?.(${k.id})" class="btn btns" style="font-size:11px;padding:2px 9px">Detay</button>
          </div>
        </div>`;
      }).join('')}
    </div>` : '',

    /* Beklenen Teslimatlar tablosu — korundu */
    (typeof window.renderEdList === 'function' ? window.renderEdList() : ''),

  ].join('');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderLojistik };
} else {
  window.renderLojistik = renderLojistik;
}
