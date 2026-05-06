/**
 * src/modules/lojistik.js  —  v5.0  Komuta Merkezi
 * LOJISTIK-KOMUTA-UI-001: 10 metric (pastel renkli) + 4 mini özet + 5 üst buton + alarm
 */
'use strict';

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
        <div class="phs">10 metric · 4 mini özet · canlı operasyon görünümü</div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <!-- V189c — Üst Excel + PDF butonları kaldırıldı:
             window._lojistikXlsx ve window._lojistikPdf hiçbir yerde tanımlı değildi
             (silent fail). ED listesindeki V187g/h/i export butonları korundu. -->
        <button class="btn btns" onclick="window.nav?.('kargo')" style="font-size:12px">Kargo Yönetimi</button>
        <button class="btn btns" onclick="window.openKonteynModal?.(null)" style="font-size:12px">+ Konteynır</button>
        <button class="btn btnp" onclick="window._edWizardAc?.()" style="font-size:12px">+ Yeni Teslimat</button>
      </div>
    </div>`,

    /* LOJISTIK-KOMUTA-UI-001: 10 metric şeridi (pastel renk paleti + hover) */
    `<div style="background:var(--sf);${B};border-top:none;border-radius:0 0 8px 8px;margin-bottom:16px;overflow:hidden">
      <div style="display:grid;grid-template-columns:repeat(10,1fr)">
        ${metrics.map((m,i)=>`<div style="padding:14px 12px;background:${metricColors[i].bg};${i<9?Br:''};transition:background .12s" onmouseenter="this.style.filter='brightness(.97)'" onmouseleave="this.style.filter='none'">
          <div style="font-size:20px;font-weight:600;color:${metricColors[i].fg};line-height:1">${m.v}</div>
          <div style="font-size:10px;color:${metricColors[i].fg};opacity:.75;margin-top:3px;letter-spacing:.02em">${m.l}</div>
        </div>`).join('')}
      </div>
    </div>`,

    /* Demuraj banner — korundu */
    (typeof renderDemurajBanner === 'function' ? (() => { renderDemurajBanner('konteyn-demuraj-bar'); return ''; })() : ''),

    /* LOJISTIK-KOMUTA-UI-001: 4 mini özet kart */
    `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:16px">
      <div style="${card};padding:14px">
        <div style="font-size:10px;${t3};text-transform:uppercase;letter-spacing:.05em;font-weight:500;margin-bottom:8px">Aktif Konteynır</div>
        ${aktifKonteynirHTML}
      </div>
      <div style="${card};padding:14px">
        <div style="font-size:10px;${t3};text-transform:uppercase;letter-spacing:.05em;font-weight:500;margin-bottom:8px">Bu Hafta</div>
        ${buHaftaHTML}
      </div>
      <div style="${card};padding:14px">
        <div style="font-size:10px;${t3};text-transform:uppercase;letter-spacing:.05em;font-weight:500;margin-bottom:8px">Eksik / Hasar</div>
        ${eksikHasarHTML}
      </div>
      <div style="${card};padding:14px">
        <div style="font-size:10px;${t3};text-transform:uppercase;letter-spacing:.05em;font-weight:500;margin-bottom:8px">Foto Bu Ay</div>
        ${fotoHTML}
      </div>
    </div>`,

    /* V184d / LOJ-METRICS-001: 4 toplam özet kart bloğu (Toplam KG, m³, Sorumlu/Satıcı, Konteyner Doluluk) */
    `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:16px">
      ${(() => {
        const totalKg = edActive.reduce((s, d) => s + (parseFloat(d.weightKg) || 0), 0);
        const totalM3 = edActive.reduce((s, d) => s + (parseFloat(d.volumeM3) || 0), 0);
        const sorumluCount = new Set(edActive.map(d => d.responsibleUserId).filter(Boolean)).size;
        const tedarikciCount = new Set(edActive.map(d => d.supplierId).filter(Boolean)).size;
        /* V184a4: ortak helper kullan (40ft/40HC tercih, 2×20ft varsayılan değil) */
        const calc = (typeof window._edCalculateContainers === 'function')
          ? window._edCalculateContainers({ weightKg: totalKg, volumeM3: totalM3 })
          : null;

        /* ─── V187f — 4 yeni kart hesapları (Standartizasyon paketi verisi + operasyonel) ─── */
        const _t = (k, fb) => (typeof window.t === 'function') ? window.t(k) : fb;

        /* Kart 5: Yükleme Önceliği (V187b verisi) */
        const priReq = edActive.filter(d => d.loadingPriority === 'REQUIRED').length;
        const priOpt = edActive.filter(d => d.loadingPriority === 'OPTIONAL').length;
        const priEmpty = edActive.length - priReq - priOpt;

        /* Kart 6: Taşıma Uyarıları (V187c verisi) — top 3 enum frequency */
        const flagCount = {};
        edActive.forEach(d => {
          (Array.isArray(d.handlingFlags) ? d.handlingFlags : []).forEach(f => {
            flagCount[f] = (flagCount[f] || 0) + 1;
          });
        });
        const top3 = Object.keys(flagCount).map(k => [k, flagCount[k]]).sort((a, b) => b[1] - a[1]).slice(0, 3);
        const emojiMap = window.HANDLING_FLAGS_EMOJI || {};
        const flagsTotal = Object.values(flagCount).reduce((s, n) => s + n, 0);
        const flagsDisplay = top3.length
          ? top3.map(([f, c]) => `${emojiMap[f] || '?'} <strong>${c}</strong>`).join(' · ')
          : `<span style="${t3}">—</span>`;

        /* Kart 7: Geciken (V189d — algoritma genişletildi: P0-3 fix)
         * Tamamlanmamış tüm aktif statuslarda ETA geçmişse geciken.
         * Önceden sadece YOLDA + GUMRUKTE sayılıyordu — TEDARIK / URETIM /
         * YUKLEME_BEKLIYOR'da ETA geçen kayıtlar gizleniyordu (operasyonel hata). */
        const today0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const COMPLETED_STATUSES_FOR_OVERDUE = ['KONTEYNIRA_YUKLENDI', 'TESLIM_ALINDI', 'MUSTERI_TESLIM_ALDI'];
        const geciken = edActive.filter(d => {
          if (COMPLETED_STATUSES_FOR_OVERDUE.indexOf(d.status) >= 0) return false;
          if (d.status === 'GECIKTI') return true;
          if (!d.estimatedDeliveryDate) return false;
          return new Date(d.estimatedDeliveryDate) < today0;
        }).length;

        /* Kart 8: Öncelikli Bekleyen (REQUIRED + henüz teslim alınmamış) — operasyonel */
        const oncelikliBekleyen = edActive.filter(d =>
          d.loadingPriority === 'REQUIRED' && d.status !== 'TESLIM_ALINDI'
        ).length;

        return `<div style="${card};padding:14px">
          <div style="font-size:10px;${t3};text-transform:uppercase;letter-spacing:.05em;font-weight:500;margin-bottom:8px">Toplam KG</div>
          <div style="font-size:20px;font-weight:600;color:var(--t);line-height:1">${Math.round(totalKg).toLocaleString('tr-TR')} <span style="font-size:11px;${t3};font-weight:400">kg</span></div>
        </div>
        <div style="${card};padding:14px">
          <div style="font-size:10px;${t3};text-transform:uppercase;letter-spacing:.05em;font-weight:500;margin-bottom:8px">Toplam m³</div>
          <div style="font-size:20px;font-weight:600;color:var(--t);line-height:1">${totalM3.toFixed(1)} <span style="font-size:11px;${t3};font-weight:400">m³</span></div>
        </div>
        <div style="${card};padding:14px">
          <div style="font-size:10px;${t3};text-transform:uppercase;letter-spacing:.05em;font-weight:500;margin-bottom:8px">Sorumlu / Satıcı</div>
          <div style="font-size:13px;color:var(--t);line-height:1.4"><strong style="font-size:18px">${sorumluCount}</strong> sorumlu · <strong style="font-size:18px">${tedarikciCount}</strong> satıcı</div>
          <div style="font-size:10px;${t3};margin-top:4px">${edActive.length} aktif kayıt</div>
        </div>
        <div style="${card};padding:14px">
          <div style="font-size:10px;${t3};text-transform:uppercase;letter-spacing:.05em;font-weight:500;margin-bottom:8px">Konteyner Doluluk</div>
          ${calc ? `<div style="font-size:11px;${t3};line-height:1.4">Toplam: ${totalM3.toFixed(1)} m³ / ${Math.round(totalKg).toLocaleString('tr-TR')} kg</div><div style="font-size:13px;font-weight:500;color:${calc.color};margin-top:4px">→ ${calc.count} × ${calc.type} yeter</div>` : `<div style="font-size:12px;${t3};text-align:center;padding:6px 0">Veri yok</div>`}
        </div>
        <!-- ─── V187f: 4 yeni kart (sıra 2: Standartizasyon + operasyonel) ─── -->
        <div style="${card};padding:14px" title="${_t('loj.card.loadingPriority.sub','Zorunlu / Opsiyonel')}">
          <div style="font-size:10px;${t3};text-transform:uppercase;letter-spacing:.05em;font-weight:500;margin-bottom:8px">⭐ ${_t('loj.card.loadingPriority','Yükleme Önceliği')}</div>
          <div style="font-size:18px;font-weight:600;color:var(--t);line-height:1">${priReq} <span style="font-size:11px;${t3};font-weight:400">zorunlu</span></div>
          <div style="font-size:10px;${t3};margin-top:4px">${priOpt} opsiyonel · ${priEmpty} boş</div>
        </div>
        <div style="${card};padding:14px" title="${_t('loj.card.handlingFlags.sub','En çok kullanılan')}">
          <div style="font-size:10px;${t3};text-transform:uppercase;letter-spacing:.05em;font-weight:500;margin-bottom:8px">🔥 ${_t('loj.card.handlingFlags','Taşıma Uyarıları')}</div>
          <div style="font-size:14px;color:var(--t);line-height:1.3;letter-spacing:1px">${flagsDisplay}</div>
          <div style="font-size:10px;${t3};margin-top:4px">${flagsTotal > 0 ? flagsTotal + ' toplam işaret' : 'işaretsiz'}</div>
        </div>
        <div style="${card};padding:14px" title="${_t('loj.card.geciken.sub','Yolda + ETA geçti')}">
          <div style="font-size:10px;${t3};text-transform:uppercase;letter-spacing:.05em;font-weight:500;margin-bottom:8px">⏰ ${_t('loj.card.geciken','Geciken')}</div>
          <div style="font-size:20px;font-weight:600;color:${geciken > 0 ? '#A32D2D' : 'var(--t)'};line-height:1">${geciken} <span style="font-size:11px;${t3};font-weight:400">kayıt</span></div>
          <div style="font-size:10px;${t3};margin-top:4px">ETA geçen aktif kayıt</div>
        </div>
        <div style="${card};padding:14px" title="${_t('loj.card.oncelikliBekleyen.sub','Zorunlu, henüz yüklenmedi')}">
          <div style="font-size:10px;${t3};text-transform:uppercase;letter-spacing:.05em;font-weight:500;margin-bottom:8px">⭐ ${_t('loj.card.oncelikliBekleyen','Öncelikli Bekleyen')}</div>
          <div style="font-size:20px;font-weight:600;color:${oncelikliBekleyen > 0 ? '#854F0B' : 'var(--t)'};line-height:1">${oncelikliBekleyen} <span style="font-size:11px;${t3};font-weight:400">bekliyor</span></div>
          <div style="font-size:10px;${t3};margin-top:4px">zorunlu öncelik</div>
        </div>`;
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
