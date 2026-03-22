/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/pirim.js  —  v9.0.0
 * Prim & Teşvik Yönetim Sistemi
 *
 * YENİLİKLER v9:
 *  • PDF yönetmelik yükleme (admin) + görüntüleme (tüm kullanıcılar)
 *  • Liderlik tablosu — kişisel sıralama
 *  • Dönem bazlı filtreleme (ay/çeyrek/yıl)
 *  • Detay modal — tüm bilgiler, onay geçmişi
 *  • Ödeme takvimi — yaklaşan ödemeler
 *  • Özet kartlar — kişisel dashboard
 *  • Excel export geliştirildi
 *  • Tüm buton/fonksiyon bağlantıları kontrol edildi
 * ════════════════════════════════════════════════════════════════
 */
'use strict';

// ── Sabitler ─────────────────────────────────────────────────────
const PIRIM_TYPES = {
  // === SATINALMA PRİM SİSTEMİ (2025 Yönetmeliği) ===
  NA: { label: 'Yeni Avcı (İlk Alım)',     emoji: '🐣', base: 'alim',    locked: true,  desc: 'İlk kez yapılan tedarik/alım' },
  SC: { label: 'Sadık Çiftçi (Tekrar)',     emoji: '🌱', base: 'alim',    locked: true,  desc: 'Mevcut tedarikçi/ürün, tekrar alım' },
  YT: { label: 'Yeni Tedarikçi',           emoji: '🔄', base: 'alim',    locked: true,  desc: 'Tekrar alımda yeni+daha iyi tedarikçi' },
  CB: { label: 'Çapraz Satış Bonusu',      emoji: '➕', base: 'serbest', locked: false, desc: '+%25 ekstra — tamamlayıcı ürün önerildi' },
  DB: { label: 'Dedektif Bonusu',          emoji: '🕵️', base: 'serbest', locked: false, desc: 'Gizli zam/hile/kalite tuzağı tespit edildi' },
  RD: { label: 'Ürün Geliştirme (R&D)',    emoji: '🔬', base: 'serbest', locked: false, desc: 'Ürün geliştirme ile satış artışı sağlandı' },
  CE: { label: 'CEO / Yönetim Takdiri',    emoji: '⭐', base: 'serbest', locked: false, desc: 'Özel yönetim ödülü' },
  DD: { label: 'Dönem Değerlendirme',      emoji: '🎯', base: 'serbest', locked: false, desc: 'Yıllık şampiyonlar ligi ödülü' },
};

// ── Satınalma Kademe Tabloları (2025 Yönetmeliği) ────────────────
// Yeni Avcı (NA): İlk kez yapılan alımlar
const TIER_YENI_AVCI = [
  { min: 0,          max: 100000,   rate: 0.0030, label: '0-100K'   }, // %0.30
  { min: 100000,     max: 250000,   rate: 0.0050, label: '100-250K' }, // %0.50
  { min: 250000,     max: 500000,   rate: 0.0070, label: '250-500K' }, // %0.70
  { min: 500000,     max: 1000000,  rate: 0.0100, label: '500K-1M'  }, // %1.00
  { min: 1000000,    max: Infinity, rate: 0.0100, label: '1M+'      }, // %1.00 (son kademe devam)
];

// Sadık Çiftçi (SC): Tekrar eden alımlar
const TIER_SADIK_CIFTCI = [
  { min: 0,          max: 100000,   rate: 0.0010, label: '0-100K'   }, // %0.10
  { min: 100000,     max: 250000,   rate: 0.0020, label: '100-250K' }, // %0.20
  { min: 250000,     max: 500000,   rate: 0.0025, label: '250-500K' }, // %0.25
  { min: 500000,     max: 1000000,  rate: 0.0030, label: '500K-1M'  }, // %0.30
  { min: 1000000,    max: Infinity, rate: 0.0030, label: '1M+'      }, // %0.30
];

/**
 * Kademeli prim hesapla (her kademe kendi oranıyla)
 * @param {number} amount - KDV'siz alım tutarı (TL)
 * @param {'NA'|'SC'|'YT'} type - prim tipi
 * @param {Object} opts - bonus/ceza çarpanları
 * @returns {{ gross, net, breakdown, appliedRate, tier }}
 */
function calcSatinalimaPrim(amount, type, opts = {}) {
  // Temel kademe tablosu
  let tiers;
  if (type === 'NA') {
    tiers = TIER_YENI_AVCI;
  } else if (type === 'YT') {
    // Yeni Tedarikçi = Yeni Avcı gibi hesap (mevcut>%10 ucuz bulundu)
    tiers = TIER_YENI_AVCI;
  } else {
    tiers = TIER_SADIK_CIFTCI;
  }

  // Kademe bul (tutar hangi kademede?)
  const tier = tiers.find(t => amount >= t.min && amount < t.max) || tiers[tiers.length - 1];
  let rate = tier.rate;

  const breakdown = [];

  // Tedarikçi yönetimi bonusu: Yeni+iyi tedarikçi = +%15 artırım
  if (opts.yeniTedarikci && (type === 'SC' || type === 'YT')) {
    const bonus = rate * 0.15;
    breakdown.push({ label: 'Yeni Tedarikçi +%15', value: bonus, positive: true });
    rate += bonus;
  }

  // Çapraz satış: +%25 (CB tipinde ayrı giriş, ama burada da flag varsa)
  if (opts.caprazSatis) {
    const bonus = rate * 0.25;
    breakdown.push({ label: 'Çapraz Satış +%25', value: bonus, positive: true });
    rate += bonus;
  }

  // Fiyat avantajı: İndirim toplamının %30'u ek prim
  if (opts.fiyatAvantajiTL && opts.fiyatAvantajiTL > 0) {
    const bonusTL = opts.fiyatAvantajiTL * 0.30;
    breakdown.push({ label: `Fiyat Avantajı +%30 (${_fmtTL(opts.fiyatAvantajiTL)} indirim)`, valueTL: bonusTL, positive: true });
  }

  // Yeni ürün: rutin prim %25 artar
  if (opts.yeniUrun && type === 'SC') {
    const bonus = rate * 0.25;
    breakdown.push({ label: 'Yeni Ürün +%25', value: bonus, positive: true });
    rate += bonus;
  }

  let gross = Math.round(amount * rate * 100) / 100;
  if (opts.fiyatAvantajiTL) gross += Math.round(opts.fiyatAvantajiTL * 0.30 * 100) / 100;

  // ── CEZA HESAPLAMALARI ──────────────────────────────────────────

  // Yönetici müdahalesi: aldığı indirimin 3 katı oransal kesinti
  if (opts.yoneticiIndirimOran && opts.yoneticiIndirimOran > 0) {
    const penaltyRate = Math.min(opts.yoneticiIndirimOran * 3, 1); // max %100
    const penaltyTL   = Math.round(gross * penaltyRate * 100) / 100;
    breakdown.push({ label: `Yetersiz Müzakere -%${(penaltyRate*100).toFixed(0)} (Yönetici indirimi x3)`, value: -penaltyRate, penaltyTL, positive: false });
    gross -= penaltyTL;
  }

  // Gecikme: 1 gün -%10, 3+ gün -%20
  if (opts.gecikmeGun && opts.gecikmeGun > 0) {
    const penaltyRate = opts.gecikmeGun >= 3 ? 0.20 : 0.10;
    const penaltyTL   = Math.round(gross * penaltyRate * 100) / 100;
    breakdown.push({ label: `Gecikme (${opts.gecikmeGun} gün) -%${(penaltyRate*100).toFixed(0)}`, penaltyTL, positive: false });
    gross -= penaltyTL;
  }

  // Tamamlayıcı ürün ihmali: -%30
  if (opts.tamamlayiciIhmal) {
    const penaltyTL = Math.round(gross * 0.30 * 100) / 100;
    breakdown.push({ label: 'Tamamlayıcı Ürün İhmali -%30', penaltyTL, positive: false });
    gross -= penaltyTL;
  }

  // Operasyonel revizyon: -%7
  if (opts.revizyonPenalty) {
    const penaltyTL = Math.round(gross * 0.07 * 100) / 100;
    breakdown.push({ label: 'Operasyonel Revizyon -%7', penaltyTL, positive: false });
    gross -= penaltyTL;
  }

  return {
    gross:       Math.max(0, Math.round(gross * 100) / 100),
    appliedRate: rate,
    tier:        tier.label,
    breakdown,
  };
}

// ── Yardımcı: TL formatla ──────────────────────────────────────────
function _fmtTL(n) {
  if (!n && n !== 0) return '';
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(n);
}

const PIRIM_STATUS = {
  pending:  { l: 'Onay Bekliyor', c: 'ba', emoji: '⏳' },
  approved: { l: 'Onaylandı',     c: 'bg', emoji: '✅' },
  rejected: { l: 'Reddedildi',    c: 'br', emoji: '❌' },
  paid:     { l: 'Ödendi',        c: 'bb', emoji: '💸' },
};

const TR_MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran',
                   'Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

// ── Yardımcılar ──────────────────────────────────────────────────
// _g → window.g (app.js)
// _st → window.st (app.js)
// _p2 → local
const _now = () => { const n = new Date(); return `${n.getFullYear()}-${_p2(n.getMonth()+1)}-${_p2(n.getDate())} ${_p2(n.getHours())}:${_p2(n.getMinutes())}:${_p2(n.getSeconds())}`; };
const _fmt = n => (n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
// _isAdm → window.isAdmin
// _cu → window.CU

// PDF localStorage key
const PDF_KEY = 'ak_pirim_pdf_v1';

// ════════════════════════════════════════════════════════════════
// BÖLÜM 1 — PANEL HTML (inject)
// ════════════════════════════════════════════════════════════════
function _injectPirimPanel() {
  const panel = window.g('panel-pirim');
  if (!panel || panel.dataset.injected) return;
  panel.dataset.injected = '1';
  panel.innerHTML = `

<!-- HEADER -->
<div class="ph">
  <div>
    <div class="pht">⭐ Prim & Teşvik Sistemi</div>
    <div class="phs">İşlem bazlı prim takibi, onay süreci ve ödeme yönetimi</div>
  </div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
    <button class="btn btns" onclick="Pirim.showPdf()" title="Prim Yönetmeliği">📄 Yönetmelik</button>
    <button class="btn btns" onclick="Pirim.exportXlsx()">⬇ Excel</button>
    <button class="btn btns" onclick="Pirim.openParams()">⚙️ Parametreler</button>
    <button class="btn btnp" onclick="Pirim.openModal(null)">+ Prim Ekle</button>
  </div>
</div>

<!-- ÖZET KARTLAR -->
<div class="sg" style="grid-template-columns:repeat(5,1fr);margin-bottom:20px">
  <div class="ms"><div class="msv" id="prm-stat-total">0</div><div class="msl">Toplam Kayıt</div></div>
  <div class="ms"><div class="msv" style="color:var(--am)" id="prm-stat-pending">0</div><div class="msl">⏳ Onay Bekliyor</div></div>
  <div class="ms"><div class="msv" style="color:var(--gr)" id="prm-stat-approved">0</div><div class="msl">✅ Onaylandı</div></div>
  <div class="ms"><div class="msv" style="color:var(--bl)" id="prm-stat-paid">0</div><div class="msl">💸 Ödendi</div></div>
  <div class="ms"><div class="msv" style="color:var(--ac)" id="prm-stat-amount">0 ₺</div><div class="msl">Toplam Onaylı</div></div>
</div>

<!-- KİŞİSEL ÖZET (personel için) -->
<div id="prm-personal-banner" style="display:none;background:linear-gradient(135deg,var(--al),var(--sf));border:1.5px solid var(--ac);border-radius:var(--r);padding:16px 20px;margin-bottom:18px">
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
    <div>
      <div style="font-size:13px;color:var(--t2);margin-bottom:4px">Bu ay kazandığın prim</div>
      <div style="font-size:26px;font-weight:800;color:var(--ac)" id="prm-my-month">0 ₺</div>
    </div>
    <div style="display:flex;gap:16px">
      <div style="text-align:center">
        <div style="font-size:18px;font-weight:700" id="prm-my-total">0 ₺</div>
        <div style="font-size:11px;color:var(--t2)">Tüm zamanlar</div>
      </div>
      <div style="text-align:center">
        <div style="font-size:18px;font-weight:700;color:var(--am)" id="prm-my-pending">0</div>
        <div style="font-size:11px;color:var(--t2)">Bekleyen</div>
      </div>
      <div style="text-align:center">
        <div style="font-size:18px;font-weight:700;color:var(--gr)" id="prm-my-rank">#—</div>
        <div style="font-size:11px;color:var(--t2)">Sıralama</div>
      </div>
    </div>
  </div>
</div>

<!-- FİLTRELER -->
<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:16px;background:var(--s2);padding:10px 14px;border-radius:14px">
  <select class="fi" id="prm-period-f" style="width:140px;max-width:140px;padding:6px 10px;font-size:12px" onchange="Pirim.render()">
    <option value="">Tüm Dönemler</option>
    <option value="thismonth">Bu Ay</option>
    <option value="lastmonth">Geçen Ay</option>
    <option value="q1">Q1 (Oca-Mar)</option>
    <option value="q2">Q2 (Nis-Haz)</option>
    <option value="q3">Q3 (Tem-Eyl)</option>
    <option value="q4">Q4 (Eki-Ara)</option>
    <option value="thisyear">Bu Yıl</option>
  </select>
  <select class="fi" id="prm-status-f" style="width:140px;max-width:140px;padding:6px 10px;font-size:12px" onchange="Pirim.render()">
    <option value="">Tüm Durumlar</option>
    <option value="pending">⏳ Bekliyor</option>
    <option value="approved">✅ Onaylı</option>
    <option value="rejected">❌ Reddedildi</option>
    <option value="paid">💸 Ödendi</option>
  </select>
  <select class="fi" id="prm-type-f" style="width:150px;max-width:150px;padding:6px 10px;font-size:12px" onchange="Pirim.render()">
    <option value="">Tüm Türler</option>
    ${Object.entries(PIRIM_TYPES).map(([k,v]) => `<option value="${k}">${v.emoji} ${v.label}</option>`).join('')}
  </select>
  <select class="fi" id="prm-user-f" style="width:140px;max-width:140px;padding:6px 10px;font-size:12px" onchange="Pirim.render()">
    <option value="0">Tüm Personel</option>
  </select>
  <input class="fi" id="prm-search" style="flex:1;min-width:120px;padding:6px 12px;font-size:12px" placeholder="🔍 Ara..." oninput="Pirim.render()">
  <button class="btn btns" onclick="Pirim.clearFilters()" style="font-size:11px;white-space:nowrap">✕ Temizle</button>
</div>

<!-- ANA İÇERİK — tablo + liderlik tablosu -->
<div style="display:grid;grid-template-columns:1fr 280px;gap:16px;align-items:start">

  <!-- TABLO -->
  <div id="pirim-list"></div>

  <!-- SAĞ PANEL -->
  <div style="display:flex;flex-direction:column;gap:14px">

    <!-- Liderlik Tablosu -->
    <div class="card">
      <div class="ch">
        <span class="ct">🏆 Liderlik Tablosu</span>
        <select style="font-size:11px;padding:3px 6px;border:1px solid var(--b);border-radius:6px;background:var(--sf);color:var(--t)" id="prm-lb-period" onchange="Pirim.renderLeaderboard()">
          <option value="month">Bu Ay</option>
          <option value="quarter">Bu Çeyrek</option>
          <option value="year">Bu Yıl</option>
          <option value="all">Tüm Zamanlar</option>
        </select>
      </div>
      <div id="pirim-leaderboard"></div>
    </div>

    <!-- Yaklaşan Ödemeler -->
    <div class="card">
      <div class="ch"><span class="ct">📅 Yaklaşan Ödemeler</span></div>
      <div id="pirim-upcoming"></div>
    </div>

    <!-- Prim Trendi -->
    <div class="card">
      <div class="ch"><span class="ct">📈 Aylık Trend</span></div>
      <div id="pirim-trend-chart" style="min-height:120px"></div>
    </div>

  </div>
</div>

<!-- MODAL: Prim Ekle/Düzenle -->
<div class="mo" id="mo-pirim">
  <div class="moc" style="max-width:580px">
    <div class="moh">
      <span class="mot" id="mo-prm-t">+ Prim Ekle</span>
      <button class="mcl" onclick="window.closeMo?.('mo-pirim')">✕</button>
    </div>
    <div class="mob">
      <input type="hidden" id="prm-eid">

      <!-- Personel + Tarih -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
        <div class="fg">
          <label class="fl">Personel</label>
          <select class="fi" id="prm-user"></select>
        </div>
        <div class="fg">
          <label class="fl">İşlem Tarihi</label>
          <input type="date" class="fi" id="prm-date">
        </div>
      </div>

      <!-- Prim Türü Kartları -->
      <div class="fg" style="margin-bottom:14px">
        <label class="fl">Prim Türü</label>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:6px" id="prm-type-cards">
          ${Object.entries(PIRIM_TYPES).map(([k,v]) => `
          <div class="prm-type-card" data-type="${k}" onclick="Pirim.selectType('${k}')"
            title="${v.desc||v.label}"
            style="border:1.5px solid var(--b);border-radius:10px;padding:8px 6px;cursor:pointer;transition:all .15s;background:var(--sf);text-align:center;overflow:hidden">
            <div style="font-size:18px;line-height:1">${v.emoji}</div>
            <div style="font-size:10px;font-weight:600;margin-top:4px;color:var(--t);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.3" title="${v.label}">${v.label}</div>
          </div>`).join('')}
        </div>
        <input type="hidden" id="prm-type">
      </div>

      <!-- Başlık + Kod -->
      <div style="display:grid;grid-template-columns:1fr auto;gap:12px;margin-bottom:14px">
        <div class="fg">
          <label class="fl">İşlem Açıklaması</label>
          <input class="fi" id="prm-title" placeholder="Tedarikçi, ürün, işlem detayı...">
        </div>
        <div class="fg" style="width:110px">
          <label class="fl">İşlem Kodu</label>
          <input class="fi" id="prm-code" placeholder="SC-001">
        </div>
      </div>

      <!-- Tutar Hesaplama -->
      <div style="background:var(--s2);border-radius:12px;padding:14px;margin-bottom:14px">
        <div style="font-size:11px;font-weight:700;color:var(--t2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Tutar Hesaplama</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
          <div class="fg">
            <label class="fl">KDV'siz Alım Tutarı (₺)</label>
            <input type="number" class="fi" id="prm-base-amount" placeholder="0" oninput="Pirim.calcAuto()" style="font-weight:600">
          </div>
          <div class="fg">
            <label class="fl">Oran (%) <span id="prm-rate-hint" style="font-size:9px;color:var(--ac);font-weight:700"></span></label>
            <input type="number" class="fi" id="prm-oran" placeholder="0.00" step="0.001" min="0" max="5" oninput="Pirim.calcAuto()">
          </div>
          <div class="fg">
            <label class="fl">Net Prim (₺)</label>
            <input type="number" class="fi" id="prm-total" placeholder="0" style="font-weight:700;color:var(--ac);background:var(--sf)">
          </div>
        </div>

        <!-- Bonus / Ceza Paneli (sadece NA/SC/YT tiplerinde görünür) -->
        <div id="prm-bonus-panel" style="display:none;margin-top:12px;border-top:1px solid var(--b);padding-top:12px">
          <div style="font-size:11px;font-weight:700;color:var(--t2);margin-bottom:8px">⚡ Bonus & Ceza Ayarları</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
              <input type="checkbox" id="chk-yeni-tedarikci" onchange="Pirim.calcAuto()">
              🔄 Yeni+daha iyi tedarikçi <small style="color:var(--t2)">(+%15)</small>
            </label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
              <input type="checkbox" id="chk-capraz" onchange="Pirim.calcAuto()">
              ➕ Çapraz satış bonusu <small style="color:var(--t2)">(+%25)</small>
            </label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
              <input type="checkbox" id="chk-yeni-urun" onchange="Pirim.calcAuto()">
              🆕 Yeni ürün (tekrar alımda) <small style="color:var(--t2)">(+%25)</small>
            </label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
              <input type="checkbox" id="chk-tamamlayici-ihmal" onchange="Pirim.calcAuto()">
              ❌ Tamamlayıcı ürün ihmali <small style="color:var(--br,-red)">(-%30)</small>
            </label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
              <input type="checkbox" id="chk-revizyon" onchange="Pirim.calcAuto()">
              ❌ Operasyonel revizyon cezası <small style="color:var(--br,-red)">(-%7)</small>
            </label>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:10px">
            <div class="fg">
              <label class="fl">Gecikme (gün) <small>(1g=-%10, 3g+=-%20)</small></label>
              <input type="number" class="fi" id="inp-gecikme-gun" placeholder="0" min="0" oninput="Pirim.calcAuto()">
            </div>
            <div class="fg">
              <label class="fl">Yönetici İndirimi (%) <small>(x3 ceza)</small></label>
              <input type="number" class="fi" id="inp-yonetici-indirim" placeholder="0" min="0" max="100" step="0.1" oninput="Pirim.calcAuto()">
            </div>
            <div class="fg">
              <label class="fl">Fiyat Avantajı (₺ indirim) <small>(+%30)</small></label>
              <input type="number" class="fi" id="inp-fiyat-avantaji" placeholder="0" min="0" oninput="Pirim.calcAuto()">
            </div>
          </div>
        </div>

        <!-- Hesaplama detay -->
        <div id="prm-calc-detail" style="display:none"></div>
      </div>

      <!-- Not -->
      <div class="fg">
        <label class="fl">Not (opsiyonel)</label>
        <textarea class="fi" id="prm-note" rows="2" placeholder="Ek bilgi..."></textarea>
      </div>
    </div>
    <div class="mof">
      <button class="btn" onclick="window.closeMo?.('mo-pirim')">İptal</button>
      <button class="btn btnp" onclick="Pirim.save()">💾 Kaydet</button>
    </div>
  </div>
</div>

<!-- MODAL: Parametreler -->
<div class="mo" id="mo-pirim-params">
  <div class="moc" style="max-width:520px">
    <div class="moh">
      <span class="mot">⚙️ Prim Parametreleri</span>
      <button class="mcl" onclick="window.closeMo?.('mo-pirim-params')">✕</button>
    </div>
    <div class="mob">
      <div id="pirim-params-list"></div>
    </div>
    <div class="mof">
      <button class="btn" onclick="window.closeMo?.('mo-pirim-params')">İptal</button>
      <button class="btn btns" onclick="Pirim.addParam()">+ Ekle</button>
      <button class="btn btnp" onclick="Pirim.saveParams()">💾 Kaydet</button>
    </div>
  </div>
</div>

<!-- MODAL: PDF Yönetmelik -->
<div class="mo" id="mo-pirim-pdf">
  <div class="moc" style="max-width:720px">
    <div class="moh">
      <span class="mot">📄 Prim Yönetmeliği</span>
      <button class="mcl" onclick="window.closeMo?.('mo-pirim-pdf')">✕</button>
    </div>
    <div class="mob" style="padding:0">
      <div id="pirim-pdf-area" style="min-height:400px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px">
        <div id="pirim-pdf-viewer" style="width:100%"></div>
      </div>
    </div>
    <div class="mof" id="pirim-pdf-footer">
      <!-- admin için yükleme butonu buraya gelir -->
    </div>
  </div>
</div>

<!-- MODAL: Detay -->
<div class="mo" id="mo-pirim-detail">
  <div class="moc" style="max-width:480px">
    <div class="moh">
      <span class="mot">📋 Prim Detayı</span>
      <button class="mcl" onclick="window.closeMo?.('mo-pirim-detail')">✕</button>
    </div>
    <div class="mob" id="pirim-detail-body"></div>
    <div class="mof">
      <button class="btn" onclick="window.closeMo?.('mo-pirim-detail')">Kapat</button>
      <button class="btn btns" onclick="Pirim.printSlip(window._pirimDetailId)">🖨 Fiş Yazdır</button>
    </div>
  </div>
</div>
`;
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 2 — RENDER
// ════════════════════════════════════════════════════════════════
function renderPirim() {
  _injectPirimPanel();

  const cu     = window.CU();
  const admin  = window.isAdmin();
  let   pirim  = admin ? window.loadPirim?.() || [] : (window.loadPirim?.() || []).filter(p => p.uid === cu?.id);
  const users  = window.loadUsers?.() || [];

  // Filtre seçenekleri doldur (ilk açılışta)
  const uSel = window.g('prm-user-f');
  if (uSel && uSel.options.length <= 1) {
    users.forEach(u => {
      const o = document.createElement('option');
      o.value = u.id; o.textContent = u.name;
      uSel.appendChild(o);
    });
  }

  // Filtrele
  const statusF = window.g('prm-status-f')?.value || '';
  const typeF   = window.g('prm-type-f')?.value   || '';
  const userF   = parseInt(window.g('prm-user-f')?.value || '0');
  const search  = (window.g('prm-search')?.value  || '').toLowerCase().trim();
  const period  = window.g('prm-period-f')?.value || '';

  let fl = [...pirim];
  if (statusF) fl = fl.filter(p => p.status === statusF);
  if (typeF)   fl = fl.filter(p => p.type   === typeF);
  if (userF)   fl = fl.filter(p => p.uid    === userF);
  if (search)  fl = fl.filter(p => (p.title||'').toLowerCase().includes(search) || (p.code||'').toLowerCase().includes(search));
  if (period)  fl = _filterByPeriod(fl, period);

  // İstatistikler
  const pending  = pirim.filter(p => p.status === 'pending').length;
  const approved = pirim.filter(p => p.status === 'approved').length;
  const paid     = pirim.filter(p => p.status === 'paid').length;
  const totalAmt = pirim.filter(p => ['approved','paid'].includes(p.status))
                        .reduce((a, p) => a + (p.amount || 0), 0);

  window.st('prm-stat-total',    pirim.length);
  window.st('prm-stat-pending',  pending);
  window.st('prm-stat-approved', approved);
  window.st('prm-stat-paid',     paid);
  window.st('prm-stat-amount',   totalAmt.toLocaleString('tr-TR') + ' ₺');

  // Badge
  const nb = window.g('nb-pirim-b');
  if (nb) { nb.textContent = pending; nb.style.display = pending > 0 ? 'inline' : 'none'; }

  // Kişisel banner (admin değilse)
  const banner = window.g('prm-personal-banner');
  if (banner && !admin && cu) {
    const myAll   = pirim.filter(p => p.uid === cu.id && ['approved','paid'].includes(p.status));
    const thisM   = new Date(); const mKey = `${thisM.getFullYear()}-${_p2(thisM.getMonth()+1)}`;
    const myMonth = myAll.filter(p => (p.date||'').startsWith(mKey)).reduce((a,p) => a+(p.amount||0), 0);
    const myTotal = myAll.reduce((a,p) => a+(p.amount||0), 0);
    const myPend  = pirim.filter(p => p.uid === cu.id && p.status === 'pending').length;

    // Sıralama
    const allUsers  = window.loadUsers?.() || [];
    const rankMap   = {};
    (window.loadPirim?.() || []).filter(p => ['approved','paid'].includes(p.status))
      .forEach(p => { rankMap[p.uid] = (rankMap[p.uid]||0) + (p.amount||0); });
    const sorted = Object.entries(rankMap).sort((a,b) => b[1]-a[1]);
    const rank   = sorted.findIndex(([uid]) => parseInt(uid) === cu.id) + 1;

    window.st('prm-my-month',   myMonth.toLocaleString('tr-TR') + ' ₺');
    window.st('prm-my-total',   myTotal.toLocaleString('tr-TR') + ' ₺');
    window.st('prm-my-pending', myPend);
    window.st('prm-my-rank',    rank > 0 ? `#${rank}` : '#—');
    banner.style.display = '';
  }

  // Liste
  const cont = window.g('pirim-list');
  if (!cont) return;

  if (!fl.length) {
    cont.innerHTML = `<div style="text-align:center;padding:48px;color:var(--t2)">
      <div style="font-size:36px;margin-bottom:12px">⭐</div>
      <div style="font-weight:500">Kayıt bulunamadı</div>
      <div style="font-size:13px;margin-top:6px">Filtreleri değiştirin veya yeni prim ekleyin.</div>
    </div>`;
    renderLeaderboard();
    renderUpcoming();
    renderTrend();
    return;
  }

  const frag  = document.createDocumentFragment();
  const table = document.createElement('table');
  table.className = 'tbl';
  table.innerHTML = `<thead><tr>
    <th>Personel</th><th>Tür</th><th>Açıklama</th>
    <th>Tutar</th><th>Tarih</th><th>Durum</th><th>İşlemler</th>
  </tr></thead>`;
  const tbody = document.createElement('tbody');

  fl.sort((a,b) => (b.date||'').localeCompare(a.date||'')).forEach(p => {
    const u    = users.find(x => x.id === p.uid) || { name: '?' };
    const st2  = PIRIM_STATUS[p.status] || PIRIM_STATUS.pending;
    const td   = PIRIM_TYPES[p.type];
    const payD = p.payDate || _calcExpiry(p.date);
    const over = p.status !== 'paid' && payD < new Date().toISOString().slice(0,10);
    const tr   = document.createElement('tr');
    if (over) tr.style.background = 'rgba(239,68,68,.03)';
    tr.innerHTML = `
      <td>
        <div style="font-weight:600;font-size:13px">${u.name}</div>
        ${p.code ? `<div style="font-size:10px;color:var(--t3);font-family:'DM Mono',monospace">${p.code}</div>` : ''}
      </td>
      <td><span class="badge bp" style="font-size:10px">${td?.emoji || ''} ${td?.label || p.type}</span></td>
      <td>
        <div style="font-size:13px;max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${p.title||''}">${p.title || '—'}</div>
        ${p.note ? `<div style="font-size:10px;color:var(--t3)">${p.note}</div>` : ''}
      </td>
      <td style="font-weight:700;font-family:'DM Mono',monospace;color:var(--ac)">${_fmt(p.amount)}</td>
      <td style="font-size:12px;font-family:'DM Mono',monospace;color:var(--t2)">${p.date||'—'}</td>
      <td><span class="badge ${st2.c}" style="font-size:11px">${st2.emoji} ${st2.l}</span></td>
      <td>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          ${admin && p.status === 'pending' ? `
            <button class="btn btns btng" onclick="Pirim.approve(${p.id})" style="font-size:11px">✓ Onayla</button>
            <button class="btn btns btnd" onclick="Pirim.reject(${p.id})"  style="font-size:11px">✕</button>` : ''}
          ${admin && p.status === 'approved' ? `
            <button class="btn btns" style="font-size:11px;color:var(--bl)" onclick="Pirim.markPaid(${p.id})">💸 Ödendi</button>` : ''}
          <button class="btn btns" onclick="Pirim.showDetail(${p.id})" style="font-size:11px" title="Detay">🔍</button>
          ${admin || p.uid === cu?.id ? `<button class="btn btns" onclick="Pirim.openModal(${p.id})" style="font-size:11px">✏️</button>` : ''}
          ${admin ? `<button class="btn btns btnd" onclick="Pirim.del(${p.id})" style="font-size:11px">🗑</button>` : ''}
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  frag.appendChild(table);
  cont.replaceChildren(frag);

  renderLeaderboard();
  renderUpcoming();
  renderTrend();
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 3 — YAN PANEL BİLEŞENLERİ
// ════════════════════════════════════════════════════════════════
function renderLeaderboard() {
  const cont = window.g('pirim-leaderboard');
  if (!cont) return;
  const period = window.g('prm-lb-period')?.value || 'month';
  const users  = window.loadUsers?.() || [];
  let   pirim  = (window.loadPirim?.() || []).filter(p => ['approved','paid'].includes(p.status));
  pirim = _filterByPeriod(pirim, period === 'month' ? 'thismonth' : period === 'quarter' ? 'q'+Math.ceil((new Date().getMonth()+1)/3) : period === 'year' ? 'thisyear' : '');

  const map = {};
  pirim.forEach(p => { map[p.uid] = (map[p.uid]||0) + (p.amount||0); });
  const sorted = Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0,5);

  if (!sorted.length) {
    cont.innerHTML = `<div style="padding:16px;text-align:center;color:var(--t2);font-size:12px">Bu dönemde veri yok</div>`;
    return;
  }

  const medals = ['🥇','🥈','🥉'];
  cont.innerHTML = sorted.map(([uid, amt], i) => {
    const u  = users.find(x => x.id === parseInt(uid)) || { name: '?' };
    const cu = window.CU();
    const isMe = parseInt(uid) === cu?.id;
    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--b);${isMe?'background:rgba(99,102,241,.05);border-radius:8px;padding:8px;margin:-0 -4px;':''}">
      <span style="font-size:16px;width:22px;text-align:center">${medals[i] || `${i+1}`}</span>
      <div style="width:28px;height:28px;border-radius:50%;background:var(--al);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--ac);flex-shrink:0">${(u.name||'?')[0]}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:${isMe?'700':'500'};color:var(--t);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${u.name}${isMe?' (sen)':''}</div>
      </div>
      <div style="font-size:12px;font-weight:700;font-family:'DM Mono',monospace;color:var(--ac)">${amt.toLocaleString('tr-TR')} ₺</div>
    </div>`;
  }).join('');
}

function renderUpcoming() {
  const cont = window.g('pirim-upcoming');
  if (!cont) return;
  const pirim = (window.loadPirim?.() || []).filter(p => p.status === 'approved');
  const today = new Date().toISOString().slice(0,10);
  const next30 = new Date(); next30.setDate(next30.getDate()+30);
  const n30 = next30.toISOString().slice(0,10);
  const users = window.loadUsers?.() || [];

  const upcoming = pirim.filter(p => {
    const pd = p.payDate || _calcExpiry(p.date);
    return pd >= today && pd <= n30;
  }).sort((a,b) => (a.payDate||'').localeCompare(b.payDate||'')).slice(0,5);

  if (!upcoming.length) {
    cont.innerHTML = `<div style="padding:12px;text-align:center;color:var(--t2);font-size:12px">Yaklaşan ödeme yok</div>`;
    return;
  }
  cont.innerHTML = upcoming.map(p => {
    const u  = users.find(x => x.id === p.uid) || { name: '?' };
    const pd = p.payDate || _calcExpiry(p.date);
    const daysLeft = Math.ceil((new Date(pd) - new Date()) / 86400000);
    return `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--b)">
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${u.name}</div>
        <div style="font-size:10px;color:var(--t3)">${p.title||'—'}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:12px;font-weight:700;color:var(--ac)">${_fmt(p.amount)}</div>
        <div style="font-size:10px;color:${daysLeft<=7?'var(--rd)':'var(--t3)'}">
          ${daysLeft <= 0 ? '🚨 Bugün!' : daysLeft === 1 ? '⚠️ Yarın' : `${daysLeft} gün`}
        </div>
      </div>
    </div>`;
  }).join('');
}

function renderTrend() {
  const chart = window.g('pirim-trend-chart');
  if (!chart) return;
  const pirim = window.loadPirim?.() || [];
  const now   = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const dt = new Date(now.getFullYear(), now.getMonth()-i, 1);
    months.push({
      label: TR_MONTHS[dt.getMonth()].slice(0,3),
      key: `${dt.getFullYear()}-${_p2(dt.getMonth()+1)}`
    });
  }
  const data = months.map(mo => {
    const recs = pirim.filter(p => ['approved','paid'].includes(p.status) && (p.date||'').startsWith(mo.key));
    return { ...mo, amt: recs.reduce((a,p) => a+(p.amount||0), 0), cnt: recs.length };
  });
  const max = Math.max(...data.map(x => x.amt), 1);

  chart.innerHTML = `
    <div style="display:flex;align-items:flex-end;gap:6px;height:90px;padding:0 4px">
      ${data.map(mo => {
        const h = Math.max(Math.round((mo.amt/max)*78), mo.amt > 0 ? 4 : 2);
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">
          <div style="font-size:8px;color:var(--ac);font-weight:700;min-height:12px;text-align:center">
            ${mo.amt > 0 ? (mo.amt >= 1000 ? Math.round(mo.amt/1000)+'K' : Math.round(mo.amt)) : ''}
          </div>
          <div style="width:100%;background:${mo.amt>0?'var(--ac)':'var(--s3)'};border-radius:4px 4px 0 0;height:${h}px;opacity:.8" title="${mo.label}: ${_fmt(mo.amt)}"></div>
          <div style="font-size:9px;color:var(--t2)">${mo.label}</div>
        </div>`;
      }).join('')}
    </div>
    <div style="font-size:10px;color:var(--t3);text-align:center;margin-top:6px">Son 6 ay · Onaylı primler</div>`;
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 4 — MODAL AÇMA & KAYDET
// ════════════════════════════════════════════════════════════════
function openPirimModal(id) {
  _injectPirimPanel();
  const users = window.loadUsers?.() || [];
  const usel  = window.g('prm-user');
  if (usel) usel.innerHTML = users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');

  // Tip kartlarını sıfırla
  document.querySelectorAll('.prm-type-card').forEach(c => {
    c.style.borderColor = 'var(--b)';
    c.style.background  = 'var(--sf)';
    c.style.transform   = '';
  });

  if (id) {
    const p = (window.loadPirim?.() || []).find(x => x.id === id);
    if (!p) return;
    if (window.g('prm-title'))       window.g('prm-title').value       = p.title       || '';
    if (window.g('prm-code'))        window.g('prm-code').value        = p.code        || '';
    if (window.g('prm-note'))        window.g('prm-note').value        = p.note        || '';
    if (window.g('prm-oran'))        window.g('prm-oran').value        = p.rate        || '';
    if (window.g('prm-base-amount')) window.g('prm-base-amount').value = p.baseAmount  || '';
    if (window.g('prm-total'))       window.g('prm-total').value       = p.amount      || '';
    if (window.g('prm-date'))        window.g('prm-date').value        = p.date        || '';
    if (window.g('prm-user'))        window.g('prm-user').value        = p.uid;
    if (window.g('prm-eid'))         window.g('prm-eid').value         = id;
    if (window.g('mo-prm-t'))        window.g('mo-prm-t').textContent  = '✏️ Prim Düzenle';
    // Bonus/ceza alanlarını yükle
    const bc = p.bonusCeza || {};
    const _chk = (id, v) => { const el = window.g(id); if (el) el.checked = !!v; };
    const _inp = (id, v) => { const el = window.g(id); if (el) el.value = v || ''; };
    _chk('chk-yeni-tedarikci',    bc.yeniTedarikci);
    _chk('chk-capraz',            bc.caprazSatis);
    _chk('chk-yeni-urun',         bc.yeniUrun);
    _chk('chk-tamamlayici-ihmal', bc.tamamlayiciIhmal);
    _chk('chk-revizyon',          bc.revizyonPenalty);
    _inp('inp-gecikme-gun',        bc.gecikmeGun);
    _inp('inp-yonetici-indirim',   bc.yoneticiIndirimOran ? (bc.yoneticiIndirimOran * 100).toFixed(1) : '');
    _inp('inp-fiyat-avantaji',     bc.fiyatAvantajiTL);
    if (p.type) selectPirimType(p.type);
  } else {
    ['prm-title','prm-code','prm-note','prm-oran','prm-base-amount','prm-total'].forEach(x => {
      const el = window.g(x); if (el) el.value = '';
    });
    // Bonus/ceza alanlarını temizle
    ['chk-yeni-tedarikci','chk-capraz','chk-yeni-urun','chk-tamamlayici-ihmal','chk-revizyon'].forEach(id => {
      const el = window.g(id); if (el) el.checked = false;
    });
    ['inp-gecikme-gun','inp-yonetici-indirim','inp-fiyat-avantaji'].forEach(id => {
      const el = window.g(id); if (el) el.value = '';
    });
    const detDiv = window.g('prm-calc-detail');
    if (detDiv) { detDiv.innerHTML = ''; detDiv.style.display = 'none'; }
    if (window.g('prm-date'))  window.g('prm-date').valueAsDate = new Date();
    if (window.g('prm-user'))  window.g('prm-user').value = window.CU()?.id;
    if (window.g('prm-eid'))   window.g('prm-eid').value  = '';
    if (window.g('mo-prm-t'))  window.g('mo-prm-t').textContent = '+ Prim Ekle';
    if (window.g('prm-type'))  window.g('prm-type').value = '';
    const bonusPanel = window.g('prm-bonus-panel');
    if (bonusPanel) bonusPanel.style.display = 'none';
  }
  window.openMo?.('mo-pirim');
}

function selectPirimType(type) {
  if (window.g('prm-type')) window.g('prm-type').value = type;
  document.querySelectorAll('.prm-type-card').forEach(card => {
    const sel = card.dataset.type === type;
    card.style.borderColor = sel ? '#6366F1' : 'var(--b)';
    card.style.background  = sel ? 'rgba(99,102,241,.08)' : 'var(--sf)';
    card.style.transform   = sel ? 'scale(1.02)' : 'scale(1)';
  });

  const td = PIRIM_TYPES[type];
  const oranEl = window.g('prm-oran');
  const hintEl = window.g('prm-rate-hint');

  // Alım tabanlı tipler: oran otomatik hesaplanır (salt okunur)
  if (td?.base === 'alim') {
    if (oranEl) {
      oranEl.readOnly = true;
      oranEl.style.background = 'var(--s2)';
      oranEl.style.color      = 'var(--t2)';
    }
    if (hintEl) hintEl.textContent = 'Kademe otomatik';
  } else {
    if (oranEl) {
      oranEl.readOnly = false;
      oranEl.style.background = '';
      oranEl.style.color      = '';
    }
    if (hintEl) hintEl.textContent = 'Serbest';
  }
  // Alım tabanlı tipler için bonus/ceza panelini göster
  const bonusPanel = window.g('prm-bonus-panel');
  if (bonusPanel) {
    bonusPanel.style.display = td?.base === 'alim' ? 'block' : 'none';
  }
  calcPirimAuto();
}

function calcPirimAuto() {
  const type = window.g('prm-type')?.value;
  const td   = PIRIM_TYPES[type] || {};
  const base = parseFloat(window.g('prm-base-amount')?.value || '0') || 0;

  if (td.base === 'alim' && ['NA','SC','YT'].includes(type)) {
    // Kademeli hesaplama — bonus/ceza checkboxları
    const opts = {
      yeniTedarikci:      window.g('chk-yeni-tedarikci')?.checked,
      caprazSatis:        window.g('chk-capraz')?.checked,
      yeniUrun:           window.g('chk-yeni-urun')?.checked,
      tamamlayiciIhmal:   window.g('chk-tamamlayici-ihmal')?.checked,
      revizyonPenalty:    window.g('chk-revizyon')?.checked,
      gecikmeGun:         parseInt(window.g('inp-gecikme-gun')?.value || '0') || 0,
      yoneticiIndirimOran: parseFloat(window.g('inp-yonetici-indirim')?.value || '0') / 100 || 0,
      fiyatAvantajiTL:    parseFloat(window.g('inp-fiyat-avantaji')?.value || '0') || 0,
    };
    const result = calcSatinalimaPrim(base, type, opts);
    const oranEl = window.g('prm-oran');
    const hintEl = window.g('prm-rate-hint');
    if (oranEl) oranEl.value = (result.appliedRate * 100).toFixed(3);
    if (hintEl) hintEl.textContent = `Kademe: ${result.tier}`;
    if (window.g('prm-total')) window.g('prm-total').value = result.gross || '';

    // Hesaplama detay göster
    const detDiv = window.g('prm-calc-detail');
    if (detDiv && result.breakdown.length > 0) {
      detDiv.innerHTML = `<div style="font-size:11px;color:var(--t2);margin-top:6px;padding:6px 8px;background:var(--sf);border-radius:6px;line-height:1.7">
        <strong>Hesaplama Detayı:</strong><br>
        Temel Oran: %${((result.appliedRate)*100).toFixed(3)} | Kademe: ${result.tier}<br>
        ${result.breakdown.map(b => `${b.positive ? '✅' : '❌'} ${b.label}`).join('<br>')}
        <br><strong>Net Prim: ${_fmtTL(result.gross)}</strong>
      </div>`;
      detDiv.style.display = 'block';
    } else if (detDiv) {
      const baseRate = (type === 'NA' ? TIER_YENI_AVCI : TIER_SADIK_CIFTCI)
        .find(t => base >= t.min && base < t.max) || (type === 'NA' ? TIER_YENI_AVCI : TIER_SADIK_CIFTCI).at(-1);
      detDiv.innerHTML = base > 0 ? `<div style="font-size:11px;color:var(--t2);margin-top:6px;padding:6px 8px;background:var(--sf);border-radius:6px">Kademe: ${baseRate?.label || '-'} → Oran: %${((baseRate?.rate||0)*100).toFixed(2)} → <strong>Net: ${_fmtTL(result.gross)}</strong></div>` : '';
      detDiv.style.display = base > 0 ? 'block' : 'none';
    }
  } else {
    // Serbest tip: manuel oran
    const rate  = parseFloat(window.g('prm-oran')?.value || '0') || 0;
    const total = Math.round(base * rate * 100) / 100;
    if (window.g('prm-total')) window.g('prm-total').value = total || '';
    const detDiv = window.g('prm-calc-detail');
    if (detDiv) detDiv.style.display = 'none';
  }
}

function savePirim() {
  const type   = window.g('prm-type')?.value;
  const title  = (window.g('prm-title')?.value || '').trim();
  const amount = parseFloat(window.g('prm-total')?.value || '0');
  const date   = window.g('prm-date')?.value || '';
  const uid    = parseInt(window.g('prm-user')?.value || window.CU()?.id);
  const eid    = parseInt(window.g('prm-eid')?.value  || '0');

  if (!type)   { window.toast?.('Prim türü seçin', 'err');     return; }
  if (!title)  { window.toast?.('Açıklama zorunludur', 'err'); return; }
  if (!amount) { window.toast?.('Tutar sıfır olamaz', 'err'); return; }
  if (!date)   { window.toast?.('Tarih zorunludur', 'err');    return; }

  const d     = window.loadPirim?.() || [];
  const entry = {
    type, title, amount, date, uid,
    code:       (window.g('prm-code')?.value || '').trim(),
    note:       (window.g('prm-note')?.value || '').trim(),
    rate:       parseFloat(window.g('prm-oran')?.value || '0') || 0,
    baseAmount: parseFloat(window.g('prm-base-amount')?.value || '0') || 0,
    payDate:    _calcExpiry(date),
    status:     window.isAdmin() ? 'approved' : 'pending',
    updatedAt:  _now(),
    // Satınalma bonus/ceza meta
    bonusCeza: {
      yeniTedarikci:       window.g('chk-yeni-tedarikci')?.checked || false,
      caprazSatis:         window.g('chk-capraz')?.checked         || false,
      yeniUrun:            window.g('chk-yeni-urun')?.checked      || false,
      tamamlayiciIhmal:    window.g('chk-tamamlayici-ihmal')?.checked || false,
      revizyonPenalty:     window.g('chk-revizyon')?.checked       || false,
      gecikmeGun:          parseInt(window.g('inp-gecikme-gun')?.value  || '0') || 0,
      yoneticiIndirimOran: parseFloat(window.g('inp-yonetici-indirim')?.value || '0') / 100 || 0,
      fiyatAvantajiTL:     parseFloat(window.g('inp-fiyat-avantaji')?.value || '0') || 0,
    },
  };

  if (eid) {
    const item = d.find(x => x.id === eid);
    if (item) Object.assign(item, entry);
  } else {
    entry.createdAt = _now();
    entry.createdBy = window.CU()?.id;
    d.push({ id: Date.now(), ...entry });
  }

  window.storePirim?.(d);
  window.closeMo?.('mo-pirim');
  renderPirim();
  window.logActivity?.('view', `Prim kaydedildi: "${title}" — ${_fmt(amount)}`);
  window.toast?.(`Prim kaydedildi ✓`, 'ok');
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 5 — ONAY / RED / ÖDEME / SİLME
// ════════════════════════════════════════════════════════════════
function approvePirim(id) {
  if (!window.isAdmin()) return;
  const d = window.loadPirim?.() || [];
  const p = d.find(x => x.id === id); if (!p) return;
  p.status     = 'approved';
  p.approvedBy = window.CU()?.id;
  p.approvedAt = _now();
  window.storePirim?.(d);
  renderPirim();
  window.toast?.('✅ Prim onaylandı', 'ok');
  window.logActivity?.('view', `Prim onaylandı: "${p.title}"`);
}

function rejectPirim(id) {
  if (!window.isAdmin()) return;
  const reason = prompt('Red nedeni (opsiyonel):') ?? '';
  const d = window.loadPirim?.() || [];
  const p = d.find(x => x.id === id); if (!p) return;
  p.status      = 'rejected';
  p.rejectedBy  = window.CU()?.id;
  p.rejectedAt  = _now();
  p.rejectReason = reason;
  window.storePirim?.(d);
  renderPirim();
  window.toast?.('Prim reddedildi', 'ok');
}

function markPirimPaid(id) {
  if (!window.isAdmin()) return;
  const d = window.loadPirim?.() || [];
  const p = d.find(x => x.id === id); if (!p) return;
  p.status = 'paid';
  p.paidAt = _now();
  p.paidBy = window.CU()?.id;
  window.storePirim?.(d);
  renderPirim();
  window.toast?.('💸 Ödendi olarak işaretlendi', 'ok');
  window.logActivity?.('view', `Prim ödendi: "${p.title}" — ${_fmt(p.amount)}`);
}

function delPirim(id) {
  if (!window.isAdmin()) { window.toast?.('Yetki yok', 'err'); return; }
  if (!confirm('Bu prim kaydını silmek istediğinizden emin misiniz?')) return;
  window.storePirim?.((window.loadPirim?.() || []).filter(x => x.id !== id));
  renderPirim();
  window.toast?.('Silindi', 'ok');
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 6 — DETAY MODAL
// ════════════════════════════════════════════════════════════════
function showPirimDetail(id) {
  _injectPirimPanel();
  window._pirimDetailId = id;
  const p     = (window.loadPirim?.() || []).find(x => x.id === id); if (!p) return;
  const users = window.loadUsers?.() || [];
  const u     = users.find(x => x.id === p.uid) || { name: '?' };
  const st2   = PIRIM_STATUS[p.status] || PIRIM_STATUS.pending;
  const td    = PIRIM_TYPES[p.type];
  const payD  = p.payDate || _calcExpiry(p.date);
  const over  = p.status !== 'paid' && payD < new Date().toISOString().slice(0,10);

  const body = window.g('pirim-detail-body');
  if (!body) return;
  body.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      ${_dRow('Personel', u.name)}
      ${_dRow('İşlem Türü', `${td?.emoji||''} ${td?.label||p.type}`)}
      ${_dRow('Açıklama', p.title||'—')}
      ${p.code ? _dRow('İşlem Kodu', p.code) : ''}
      ${_dRow('Baz Tutar', _fmt(p.baseAmount))}
      ${_dRow('Oran', `%${((p.rate||0)*100).toFixed(0)}`)}
      ${_dRow('Net Prim', `<span style="font-weight:800;color:var(--ac)">${_fmt(p.amount)}</span>`)}
      ${_dRow('İşlem Tarihi', p.date||'—')}
      ${_dRow('Ödeme Tarihi', `<span style="color:${over?'var(--rd)':'var(--t)'}">${payD}${over?' ⚠️':''}</span>`)}
      ${_dRow('Durum', `<span class="badge ${st2.c}">${st2.emoji} ${st2.l}</span>`)}
      ${p.note ? _dRow('Not', p.note) : ''}
      ${p.createdAt ? _dRow('Oluşturulma', p.createdAt) : ''}
      ${p.approvedAt ? _dRow('Onaylanma', p.approvedAt) : ''}
      ${p.paidAt ? _dRow('Ödeme T.', p.paidAt) : ''}
      ${p.rejectReason ? _dRow('Red Nedeni', `<span style="color:var(--rd)">${p.rejectReason}</span>`) : ''}
    </div>`;
  window.openMo?.('mo-pirim-detail');
}

function _dRow(label, value) {
  return `<div style="padding:8px 0;border-bottom:1px solid var(--b)">
    <div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px">${label}</div>
    <div style="font-size:13px;color:var(--t)">${value}</div>
  </div>`;
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 7 — PDF YÖNETMELİK
// ════════════════════════════════════════════════════════════════
function showPirimPdf() {
  _injectPirimPanel();
  const area   = window.g('pirim-pdf-area');
  const viewer = window.g('pirim-pdf-viewer');
  const footer = window.g('pirim-pdf-footer');
  if (!area || !viewer || !footer) return;

  const stored = _loadPdf();

  // Footer: admin için yükleme butonu
  if (window.isAdmin()) {
    footer.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;flex:1;flex-wrap:wrap">
      <button class="btn btns" onclick="document.getElementById('pirim-pdf-input').click()" style="cursor:pointer">
        📎 PDF Yükle
      </button>
      <input type="file" id="pirim-pdf-input" accept=".pdf,application/pdf" style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none"
        onchange="Pirim._uploadPdf(this)">
      ${stored ? `<button class="btn btns btnd" onclick="Pirim._deletePdf()">🗑 Kaldır</button>` : ''}
      <span style="font-size:11px;color:var(--t2)">${stored ? '✅ Yüklenmiş PDF mevcut' : 'Henüz PDF yüklenmedi'}</span>
    </div>
    <div style="font-size:10px;color:var(--t3);text-align:right;line-height:1.5;margin-top:4px">
      ⚠️ Yalnızca <strong>.pdf</strong> formatı · Maks. <strong>3 MB</strong><br>
      Tarayıcı önbelleğine kaydedilir (localStorage)
    </div>
    <button class="btn" onclick="window.closeMo?.('mo-pirim-pdf')" style="flex-shrink:0">Kapat</button>`;
  } else {
    footer.innerHTML = `<button class="btn" onclick="window.closeMo?.('mo-pirim-pdf')">Kapat</button>`;
  }

  if (!stored) {
    viewer.innerHTML = `
      <div style="text-align:center;padding:40px;color:var(--t2)">
        <div style="font-size:40px;margin-bottom:12px">📄</div>
        <div style="font-weight:600;margin-bottom:6px">Yönetmelik henüz yüklenmedi</div>
        <div style="font-size:13px">${window.isAdmin()
          ? '📎 "PDF Yükle" butonunu kullanın. <br><small style="color:var(--t3)">Maks. 3 MB · Yalnızca .pdf</small>'
          : 'Yöneticinizden yönetmeliği sisteme yüklemesini isteyin.'}</div>
      </div>`;
  } else {
    viewer.innerHTML = `
      <iframe src="${stored}" style="width:100%;height:520px;border:none;border-radius:8px" title="Prim Yönetmeliği"></iframe>`;
  }

  window.openMo?.('mo-pirim-pdf');
}

function _uploadPdf(input) {
  const file = input?.files?.[0];
  if (!file) return;
  if (!file.type.includes('pdf')) { window.toast?.('Sadece PDF dosyası yükleyin', 'err'); input.value = ''; return; }
  // 3MB limit (localStorage güvenliği için konservatif)
  const MAX_MB = 3;
  if (file.size > MAX_MB * 1024 * 1024) {
    window.toast?.(`PDF ${MAX_MB}MB'dan küçük olmalı (seçilen: ${(file.size/1024/1024).toFixed(1)}MB)`, 'err');
    input.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    try {
      localStorage.setItem(PDF_KEY, e.target.result);
      input.value = '';
      window.toast?.('✅ PDF yüklendi', 'ok');
      window.logActivity?.('view', `Prim yönetmeliği PDF güncellendi`);
      showPirimPdf(); // modal'ı yenile
    } catch (err) {
      input.value = '';
      window.toast?.(`PDF kaydedilemedi — tarayıcı depolama alanı dolu olabilir (${(file.size/1024/1024).toFixed(1)}MB)`, 'err');
    }
  };
  reader.onerror = () => { window.toast?.('Dosya okunamadı', 'err'); input.value = ''; };
  reader.readAsDataURL(file);
}

function _deletePdf() {
  if (!confirm('Yönetmelik PDF\'i kaldırmak istediğinizden emin misiniz?')) return;
  try { localStorage.removeItem(PDF_KEY); } catch(e) {}
  window.toast?.('PDF kaldırıldı', 'ok');
  showPirimPdf();
}

function _loadPdf() {
  try { return localStorage.getItem(PDF_KEY); } catch(e) { return null; }
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 8 — PARAMETRELER
// ════════════════════════════════════════════════════════════════
let _PARAMS_TEMP = [];

function openPirimParams() {
  _injectPirimPanel();
  if (!window.isAdmin()) { window.toast?.('Sadece yönetici erişebilir', 'err'); return; }
  _PARAMS_TEMP = JSON.parse(JSON.stringify(window.loadPirimParams?.() || []));
  _renderParamsList();
  window.openMo?.('mo-pirim-params');
}

function _renderParamsList() {
  const cont = window.g('pirim-params-list');
  if (!cont) return;
  cont.innerHTML = _PARAMS_TEMP.map((p, i) => `
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap">
      <input class="fi" value="${p.label||p.name||''}" style="flex:3;min-width:120px;padding:5px 8px;font-size:12px"
        oninput="_PARAMS_TEMP[${i}].label=this.value" placeholder="Parametre adı">
      <input class="fi" value="${p.code||''}" style="flex:1;min-width:60px;padding:5px 8px;font-size:12px"
        oninput="_PARAMS_TEMP[${i}].code=this.value" placeholder="KOD">
      <input type="number" class="fi" value="${p.rate!=null?(p.rate*100).toFixed(0):''}" style="flex:1;min-width:60px;padding:5px 8px;font-size:12px"
        oninput="_PARAMS_TEMP[${i}].rate=parseFloat(this.value)/100||null" placeholder="% oran">
      <button onclick="_PARAMS_TEMP.splice(${i},1);_renderParamsList()"
        style="background:var(--rdb);border:none;border-radius:6px;padding:4px 8px;cursor:pointer;color:var(--rdt);font-size:12px">✕</button>
    </div>`).join('');
}

function addPirimParam() {
  _PARAMS_TEMP.push({ id: Date.now(), label: '', code: '', rate: 0, locked: false });
  _renderParamsList();
}

function savePirimParams() {
  if (!window.isAdmin()) return;
  const valid = _PARAMS_TEMP.filter(p => (p.label||p.name||'').trim());
  window.storePirimParams?.(valid);
  window.closeMo?.('mo-pirim-params');
  renderPirim();
  window.toast?.('✅ Parametreler kaydedildi', 'ok');
  window.logActivity?.('view', 'Prim parametreleri güncellendi');
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 9 — EXCEL EXPORT
// ════════════════════════════════════════════════════════════════
function exportPirimXlsx() {
  if (typeof XLSX === 'undefined') { window.toast?.('Excel kütüphanesi yüklenmedi', 'err'); return; }
  const users = window.loadUsers?.() || [];
  const rows  = (window.loadPirim?.() || []).map(p => {
    const u = users.find(x => x.id === p.uid) || { name: '?' };
    return {
      'Personel':      u.name,
      'Tür':           `${PIRIM_TYPES[p.type]?.emoji||''} ${PIRIM_TYPES[p.type]?.label||p.type}`,
      'Kod':           p.code || '',
      'Açıklama':      p.title || '',
      'Baz Tutar':     p.baseAmount || 0,
      'Oran (%)':      ((p.rate||0)*100).toFixed(0) + '%',
      'Net Prim (₺)':  p.amount || 0,
      'İşlem Tarihi':  p.date || '',
      'Ödeme Tarihi':  p.payDate || _calcExpiry(p.date),
      'Durum':         `${PIRIM_STATUS[p.status]?.emoji||''} ${PIRIM_STATUS[p.status]?.l||p.status}`,
      'Not':           p.note || '',
    };
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Prim Listesi');
  XLSX.writeFile(wb, `Prim_${new Date().toISOString().slice(0,10)}.xlsx`);
  window.toast?.('Excel indirildi ✓', 'ok');
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 10 — PRİM FİŞİ YAZDIR
// ════════════════════════════════════════════════════════════════
function printPirimSlip(id) {
  const p = (window.loadPirim?.() || []).find(x => x.id === id); if (!p) return;
  const users = window.loadUsers?.() || [];
  const u = users.find(x => x.id === p.uid) || { name: '?' };
  const st2 = PIRIM_STATUS[p.status] || PIRIM_STATUS.pending;
  const td  = PIRIM_TYPES[p.type];

  const win = window.open('', '_blank', 'width=580,height=750');
  if (!win) { window.toast?.('Popup engellenmiş — tarayıcı izni verin', 'err'); return; }
  win.document.write(`<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8">
  <title>Prim Fişi — ${u.name}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 32px; max-width: 500px; margin: 0 auto; color: #1a1a1a; }
    h1 { font-size: 16px; text-align: center; margin: 0 0 4px; }
    h2 { font-size: 12px; font-weight: normal; text-align: center; color: #666; margin: 0 0 20px; }
    .divider { border: none; border-top: 2px solid #3C3489; margin: 16px 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    td { padding: 7px 10px; border-bottom: 1px solid #eee; font-size: 12px; vertical-align: top; }
    .lbl { color: #666; width: 42%; font-weight: normal; }
    .val { font-weight: 600; }
    .amount { font-size: 20px; font-weight: 800; color: #3C3489; }
    .sign { margin-top: 40px; display: flex; justify-content: space-between; }
    .sign div { width: 45%; text-align: center; border-top: 1px solid #333; padding-top: 8px; font-size: 11px; color: #444; }
    .footer { margin-top: 20px; font-size: 9px; color: #aaa; text-align: center; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; background: #eee; }
    @media print { body { padding: 20px; } }
  </style></head><body>
  <h1>Operasyon Platformu — Prim Fişi</h1>
  <h2>Prim & Teşvik Yönetim Sistemi</h2>
  <hr class="divider">
  <table>
    <tr><td class="lbl">Personel</td><td class="val">${u.name}</td></tr>
    <tr><td class="lbl">İşlem Türü</td><td class="val">${td?.emoji||''} ${td?.label||p.type}</td></tr>
    <tr><td class="lbl">Açıklama</td><td class="val">${p.title||'—'}</td></tr>
    ${p.code ? `<tr><td class="lbl">İşlem Kodu</td><td class="val">${p.code}</td></tr>` : ''}
    <tr><td class="lbl">Baz Tutar</td><td class="val">${_fmt(p.baseAmount)}</td></tr>
    <tr><td class="lbl">Prim Oranı</td><td class="val">%${((p.rate||0)*100).toFixed(0)}</td></tr>
    <tr><td class="lbl" style="font-weight:bold">NET PRİM</td><td class="amount">${_fmt(p.amount)}</td></tr>
    <tr><td class="lbl">İşlem Tarihi</td><td class="val">${p.date||'—'}</td></tr>
    <tr><td class="lbl">Ödeme Tarihi</td><td class="val">${p.payDate||_calcExpiry(p.date)}</td></tr>
    <tr><td class="lbl">Durum</td><td><span class="badge">${st2.emoji} ${st2.l}</span></td></tr>
    ${p.note ? `<tr><td class="lbl">Not</td><td>${p.note}</td></tr>` : ''}
    ${p.approvedAt ? `<tr><td class="lbl">Onaylanma</td><td class="val">${p.approvedAt}</td></tr>` : ''}
  </table>
  <div class="sign">
    <div>Hazırlayan<br><br>${u.name}</div>
    <div>Onaylayan<br><br>${p.approvedAt ? 'Onaylandı ✓' : '……………………'}</div>
  </div>
  <p class="footer">Operasyon Platformu · ${_now()} · Gizli ve Şirkete Özel</p>
  <script>setTimeout(()=>window.print(),300);<\/script>
  </body></html>`);
  win.document.close();
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 11 — YARDIMCILAR
// ════════════════════════════════════════════════════════════════
function _calcExpiry(dateStr) {
  try {
    const d = new Date(dateStr || new Date());
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  } catch(e) { return ''; }
}

function _filterByPeriod(arr, period) {
  if (!period) return arr;
  const now = new Date();
  const y   = now.getFullYear();
  const m   = now.getMonth(); // 0-indexed

  const inRange = (date, from, to) => date >= from && date <= to;

  return arr.filter(p => {
    const d = p.date || '';
    if (!d) return false;
    if (period === 'thismonth') {
      const key = `${y}-${_p2(m+1)}`;
      return d.startsWith(key);
    }
    if (period === 'lastmonth') {
      const lm = m === 0 ? 11 : m - 1;
      const ly = m === 0 ? y - 1 : y;
      return d.startsWith(`${ly}-${_p2(lm+1)}`);
    }
    if (period === 'thisyear') return d.startsWith(`${y}`);
    if (period === 'q1') return inRange(d, `${y}-01-01`, `${y}-03-31`);
    if (period === 'q2') return inRange(d, `${y}-04-01`, `${y}-06-30`);
    if (period === 'q3') return inRange(d, `${y}-07-01`, `${y}-09-30`);
    if (period === 'q4') return inRange(d, `${y}-10-01`, `${y}-12-31`);
    return true;
  });
}

function clearPirimFilters() {
  ['prm-period-f','prm-status-f','prm-type-f','prm-user-f'].forEach(id => {
    const el = window.g(id); if (el) el.value = el.id === 'prm-user-f' ? '0' : '';
  });
  const s = window.g('prm-search'); if (s) s.value = '';
  renderPirim();
}

// ════════════════════════════════════════════════════════════════
// DIŞA AKTARIM
// ════════════════════════════════════════════════════════════════
const Pirim = {
  render:          renderPirim,
  openModal:       openPirimModal,
  save:            savePirim,
  approve:         approvePirim,
  reject:          rejectPirim,
  markPaid:        markPirimPaid,
  del:             delPirim,
  selectType:      selectPirimType,
  calcAuto:        calcPirimAuto,
  showDetail:      showPirimDetail,
  showPdf:         showPirimPdf,
  _uploadPdf:      _uploadPdf,
  _deletePdf:      _deletePdf,
  exportXlsx:      exportPirimXlsx,
  openParams:      openPirimParams,
  addParam:        addPirimParam,
  saveParams:      savePirimParams,
  renderLeaderboard: renderLeaderboard,
  printSlip:       printPirimSlip,
  clearFilters:    clearPirimFilters,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Pirim;
} else {
  window.Pirim = Pirim;
  // Geriye uyumluluk
  window.renderPirim        = renderPirim;
  window.openPirimModal     = openPirimModal;
  window.savePirim          = savePirim;
  window.approvePirim       = approvePirim;
  window.rejectPirim        = rejectPirim;
  window.markPirimPaid      = markPirimPaid;
  window.delPirim           = delPirim;
  window.selectPirimType    = selectPirimType;
  window.calcPirimAuto      = calcPirimAuto;
  window.exportPirimXlsx    = exportPirimXlsx;
  window.openPirimParams    = openPirimParams;
  window.addPirimParam      = addPirimParam;
  window.savePirimParams    = savePirimParams;
  window._renderParamsList  = _renderParamsList;
  window._PARAMS_TEMP       = _PARAMS_TEMP;
  window.printPirimSlip     = printPirimSlip;
}
