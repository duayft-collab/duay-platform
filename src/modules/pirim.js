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
  // Admin'in özelleştirdiği tier tabloları, yoksa varsayılan
  const tiersNA = opts.tiersNA || TIER_YENI_AVCI;
  const tiersSC = opts.tiersSC || TIER_SADIK_CIFTCI;

  let tiers;
  if (type === 'NA') {
    tiers = tiersNA;
  } else if (type === 'YT') {
    tiers = tiersNA; // YT = Yeni Avcı oranı
  } else {
    tiers = tiersSC;
  }

  const tier = tiers.find(t => amount >= t.min && amount < t.max) || tiers[tiers.length - 1];
  let rate = tier.rate;

  const breakdown = [];

  // Admin'in belirlediği çarpanlar (yoksa yönetmelik varsayılanı)
  const mYT  = opts.multYeniTedarikci  ?? 0.15;
  const mCS  = opts.multCapraz         ?? 0.25;
  const mYU  = opts.multYeniUrun       ?? 0.25;
  const mFA  = opts.multFiyatAvantaji  ?? 0.30;
  const mTI  = opts.multTamamlayici    ?? 0.30;
  const mRV  = opts.multRevizyon       ?? 0.07;

  if (opts.yeniTedarikci && (type === 'SC' || type === 'YT')) {
    const bonus = rate * mYT;
    breakdown.push({ label: `Yeni Tedarikçi +%${(mYT*100).toFixed(0)}`, value: bonus, positive: true });
    rate += bonus;
  }

  if (opts.caprazSatis) {
    const bonus = rate * mCS;
    breakdown.push({ label: `Çapraz Satış +%${(mCS*100).toFixed(0)}`, value: bonus, positive: true });
    rate += bonus;
  }

  if (opts.yeniUrun && type === 'SC') {
    const bonus = rate * mYU;
    breakdown.push({ label: `Yeni Ürün +%${(mYU*100).toFixed(0)}`, value: bonus, positive: true });
    rate += bonus;
  }

  let gross = Math.round(amount * rate * 100) / 100;

  if (opts.fiyatAvantajiTL && opts.fiyatAvantajiTL > 0) {
    const bonusTL = Math.round(opts.fiyatAvantajiTL * mFA * 100) / 100;
    breakdown.push({ label: `Fiyat Avantajı +%${(mFA*100).toFixed(0)} (${_fmtTL(opts.fiyatAvantajiTL)} indirim)`, valueTL: bonusTL, positive: true });
    gross += bonusTL;
  }

  // ── Cezalar ──────────────────────────────────────────────────
  if (opts.yoneticiIndirimOran && opts.yoneticiIndirimOran > 0) {
    const penaltyRate = Math.min(opts.yoneticiIndirimOran * 3, 1);
    const penaltyTL   = Math.round(gross * penaltyRate * 100) / 100;
    breakdown.push({ label: `Yetersiz Müzakere -%${(penaltyRate*100).toFixed(0)} (Yönetici indirimi x3)`, penaltyTL, positive: false });
    gross -= penaltyTL;
  }

  if (opts.gecikmeGun && opts.gecikmeGun > 0) {
    const penaltyRate = opts.gecikmeGun >= 3 ? 0.20 : 0.10;
    const penaltyTL   = Math.round(gross * penaltyRate * 100) / 100;
    breakdown.push({ label: `Gecikme (${opts.gecikmeGun} gün) -%${(penaltyRate*100).toFixed(0)}`, penaltyTL, positive: false });
    gross -= penaltyTL;
  }

  if (opts.tamamlayiciIhmal) {
    const penaltyTL = Math.round(gross * mTI * 100) / 100;
    breakdown.push({ label: `Tamamlayıcı Ürün İhmali -%${(mTI*100).toFixed(0)}`, penaltyTL, positive: false });
    gross -= penaltyTL;
  }

  if (opts.revizyonPenalty) {
    const penaltyTL = Math.round(gross * mRV * 100) / 100;
    breakdown.push({ label: `Operasyonel Revizyon -%${(mRV*100).toFixed(0)}`, penaltyTL, positive: false });
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
  pending:     { l: 'Onay Bekliyor',    c: 'ba', emoji: '⏳' },
  peer_review: { l: 'Ara Onay Bekliyor',c: 'ba', emoji: '👤' },  // ikinci onay bekleniyor
  approved:    { l: 'Onaylandı',        c: 'bg', emoji: '✅' },
  rejected:    { l: 'Reddedildi',       c: 'br', emoji: '❌' },
  paid:        { l: 'Ödendi',           c: 'bb', emoji: '💸' },
  expired:     { l: 'Süresi Doldu',     c: 'br', emoji: '⏰' },
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

// ════════════════════════════════════════════════════════════════
// DİNAMİK MODAL OLUŞTURUCU — index.html / modals.js bağımlılığı yok
// ════════════════════════════════════════════════════════════════
function _ensurePirimModals() {
  // mo-pirim-params
  if (!document.getElementById('mo-pirim-params')) {
    const mo = document.createElement('div');
    mo.className = 'mo'; mo.id = 'mo-pirim-params'; mo.style.zIndex = '2300';
    mo.innerHTML = `
      <div class="moc" style="max-width:640px;padding:0;border-radius:14px;overflow:hidden">
        <div style="background:#1e1b4b;padding:14px 22px;color:#fff;display:flex;align-items:center;justify-content:space-between">
          <div style="font-size:14px;font-weight:600">⚙️ Prim Parametreleri</div>
          <button onclick="window.closeMo?.('mo-pirim-params')" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:7px;padding:3px 10px;cursor:pointer;font-size:16px">×</button>
        </div>
        <div style="max-height:72vh;overflow-y:auto">
          <div style="padding:16px 20px;border-bottom:1px solid var(--b)">
            <div style="font-size:12px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">İşlem Türü Oranları</div>
            <div id="pirim-params-type-list"></div>
          </div>
          <div style="padding:16px 20px;border-bottom:1px solid var(--b)">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
              <div style="font-size:12px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.06em">Kademeler — Yeni Avcı</div>
              <button onclick="Pirim.addTierRow('NA')" class="btn btns" style="font-size:11px">+ Kademe</button>
            </div>
            <div id="pirim-params-tier-na"></div>
          </div>
          <div style="padding:16px 20px;border-bottom:1px solid var(--b)">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
              <div style="font-size:12px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.06em">Kademeler — Sadık Çiftçi</div>
              <button onclick="Pirim.addTierRow('SC')" class="btn btns" style="font-size:11px">+ Kademe</button>
            </div>
            <div id="pirim-params-tier-sc"></div>
          </div>
          <div style="padding:16px 20px">
            <div style="font-size:12px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Çarpanlar</div>
            <div id="pirim-params-multipliers"></div>
          </div>
        </div>
        <div style="padding:12px 20px;border-top:1px solid var(--b);display:flex;justify-content:space-between;background:var(--s2)">
          <button class="btn" onclick="window.closeMo?.('mo-pirim-params')">İptal</button>
          <button class="btn btnp" onclick="Pirim.saveParams()">💾 Kaydet</button>
        </div>
      </div>`;
    document.body.appendChild(mo);
  }

  // mo-pirim-peer
  if (!document.getElementById('mo-pirim-peer')) {
    const mo = document.createElement('div');
    mo.className = 'mo'; mo.id = 'mo-pirim-peer'; mo.style.zIndex = '2300';
    mo.innerHTML = `
      <div class="moc" style="max-width:420px;padding:0;border-radius:14px;overflow:hidden">
        <div style="background:#0369A1;padding:14px 20px;color:#fff;display:flex;align-items:center;justify-content:space-between">
          <div style="font-size:14px;font-weight:600">👤 Ara Onaya Yönlendir</div>
          <button onclick="window.closeMo?.('mo-pirim-peer')" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:7px;padding:3px 10px;cursor:pointer;font-size:16px">×</button>
        </div>
        <div style="padding:18px 20px;display:flex;flex-direction:column;gap:12px">
          <input type="hidden" id="peer-pirim-id">
          <div class="fr">
            <div class="fl">ONAYCI KİŞİ *</div>
            <select class="fi" id="peer-user-sel"><option value="">— Kişi seçin —</option></select>
          </div>
          <div class="fr">
            <div class="fl">NOT (opsiyonel)</div>
            <textarea class="fi" id="peer-note" rows="3" style="resize:none" placeholder="Neden yönlendiriyorsunuz?"></textarea>
          </div>
          <div style="font-size:11px;color:var(--t3);padding:8px;background:var(--s2);border-radius:7px">
            💡 Seçilen kişi onayladıktan sonra siz nihai onayı vereceksiniz.
          </div>
        </div>
        <div style="padding:12px 20px;border-top:1px solid var(--b);display:flex;justify-content:space-between;background:var(--s2)">
          <button class="btn" onclick="window.closeMo?.('mo-pirim-peer')">İptal</button>
          <button class="btn btnp" onclick="Pirim.sendToPeer()">📨 Yönlendir</button>
        </div>
      </div>`;
    document.body.appendChild(mo);
  }

  // mo-pirim-detail
  if (!document.getElementById('mo-pirim-detail')) {
    const mo = document.createElement('div');
    mo.className = 'mo'; mo.id = 'mo-pirim-detail'; mo.style.zIndex = '2300';
    mo.innerHTML = `
      <div class="moc" style="max-width:500px;padding:0;border-radius:14px;overflow:hidden">
        <div style="background:#1e1b4b;padding:14px 20px;color:#fff;display:flex;align-items:center;justify-content:space-between">
          <div style="font-size:14px;font-weight:600">🔍 Prim Detayı</div>
          <button onclick="window.closeMo?.('mo-pirim-detail')" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:7px;padding:3px 10px;cursor:pointer;font-size:16px">×</button>
        </div>
        <div id="pirim-detail-body" style="padding:18px 20px;max-height:65vh;overflow-y:auto"></div>
        <div id="pirim-detail-footer" style="padding:12px 20px;border-top:1px solid var(--b);display:flex;justify-content:flex-end;gap:8px;background:var(--s2)">
          <button class="btn" onclick="window.closeMo?.('mo-pirim-detail')">Kapat</button>
        </div>
      </div>`;
    document.body.appendChild(mo);
  }

  // mo-pirim (prim ekleme/düzenleme modalı)
  if (!document.getElementById('mo-pirim')) {
    const mo = document.createElement('div');
    mo.className = 'mo'; mo.id = 'mo-pirim'; mo.style.zIndex = '2200';
    mo.innerHTML = `
      <div class="moc" style="max-width:600px;padding:0;border-radius:14px;overflow:hidden">
        <div style="background:#1e1b4b;padding:14px 22px;color:#fff;display:flex;align-items:center;justify-content:space-between">
          <div style="font-size:14px;font-weight:600" id="mo-pirim-t">+ Prim Ekle</div>
          <button onclick="window.closeMo?.('mo-pirim')" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:7px;padding:3px 10px;cursor:pointer;font-size:16px">×</button>
        </div>
        <div class="mob" style="padding:18px 22px;max-height:72vh;overflow-y:auto;display:flex;flex-direction:column;gap:14px">
          <input type="hidden" id="prm-eid">
          <!-- Tip seçici -->
          <div class="fr"><div class="fl">İŞLEM TÜRÜ *</div>
            <div id="prm-type-cards" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px"></div>
            <input type="hidden" id="prm-type">
          </div>
          <!-- Personel (admin/yönetici: tüm personel, user: sadece kendisi) -->
          <div class="fr" id="prm-uid-row">
            <div class="fl">PERSONEL *</div>
            <select class="fi" id="prm-uid"><option value="">— Seçin —</option></select>
          </div>
          <!-- Görev ID Seçici -->
          <div class="fr">
            <div class="fl">GÖREV ID <span style="font-size:10px;color:var(--t3);font-weight:400">(opsiyonel)</span></div>
            <select class="fi" id="prm-taskid" onchange="window._pirimTaskSelected?.()">
              <option value="">— Görev seçin —</option>
            </select>
            <div id="prm-task-info" style="display:none;font-size:10px;color:var(--t3);margin-top:4px;background:var(--s2);border-radius:6px;padding:6px 10px"></div>
          </div>
          <!-- Baz tutar -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div class="fr"><div class="fl">BAZ TUTAR (₺) *</div>
              <input class="fi" type="number" id="prm-base-amount" placeholder="0" min="0" oninput="Pirim.calcAuto()">
            </div>
            <div class="fr"><div class="fl">ORAN (%)
              <span id="prm-rate-hint" style="font-size:10px;color:var(--t3);font-weight:400;margin-left:4px"></span>
            </div>
              <input class="fi" type="number" id="prm-oran" placeholder="—" step="0.01">
            </div>
          </div>
          <!-- Net prim -->
          <div style="padding:10px 14px;background:linear-gradient(135deg,var(--alb),var(--sf));border:1px solid var(--ac);border-radius:10px;display:flex;align-items:center;justify-content:space-between">
            <span style="font-size:12px;color:var(--t2)">Net Prim Tutarı</span>
            <span style="font-size:22px;font-weight:800;color:var(--ac)" id="prm-total">—</span>
          </div>
          <input type="hidden" id="prm-base-amount-hidden">
          <!-- Açıklama + kod -->
          <div class="fr"><div class="fl">AÇIKLAMA *</div>
            <input class="fi" id="prm-title" placeholder="Kısa açıklama...">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div class="fr"><div class="fl">İŞLEM KODU</div>
              <input class="fi" id="prm-code" placeholder="Opsiyonel">
            </div>
            <div class="fr"><div class="fl">TARİH *</div>
              <input class="fi" type="date" id="prm-date">
            </div>
          </div>
          <!-- Not -->
          <div class="fr"><div class="fl">NOT</div>
            <textarea class="fi" id="prm-note" rows="2" style="resize:none" placeholder="Ek bilgi..."></textarea>
          </div>
          <!-- Kanıt Dosyası (zorunlu) -->
          <div class="fr">
            <div class="fl">KANIT DOSYASI <span style="color:var(--rd)">*</span></div>
            <input type="file" id="prm-evidence-file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx" style="font-size:12px">
            <div id="prm-evidence-preview" style="font-size:10px;color:var(--t3);margin-top:3px">Fatura, ekran görüntüsü veya belge yükleyin</div>
          </div>
          <!-- Bonus/ceza (alım tipleri için) -->
          <div id="prm-bonus-panel" style="display:none">
            <div style="font-size:11px;font-weight:600;color:var(--t3);text-transform:uppercase;margin-bottom:8px">Bonus / Ceza Faktörleri</div>
            <div style="display:flex;flex-direction:column;gap:6px">
              <label style="display:flex;align-items:center;gap:8px;font-size:12px"><input type="checkbox" id="chk-yeni-tedarikci"> Yeni tedarikçi (+%15)</label>
              <label style="display:flex;align-items:center;gap:8px;font-size:12px"><input type="checkbox" id="chk-capraz"> Çapraz satış (+%25)</label>
              <label style="display:flex;align-items:center;gap:8px;font-size:12px"><input type="checkbox" id="chk-yeni-urun"> Yeni ürün grubu (+%25)</label>
              <label style="display:flex;align-items:center;gap:8px;font-size:12px"><input type="checkbox" id="chk-tamamlayici-ihmal"> Tamamlayıcı ihmal (-%30)</label>
              <label style="display:flex;align-items:center;gap:8px;font-size:12px"><input type="checkbox" id="chk-revizyon"> Revizyon cezası (-%7)</label>
              <div style="display:flex;gap:10px;margin-top:4px">
                <div class="fr" style="flex:1"><div class="fl">Gecikme (gün)</div>
                  <input class="fi" type="number" id="inp-gecikme-gun" min="0" placeholder="0" oninput="Pirim.calcAuto()">
                </div>
                <div class="fr" style="flex:1"><div class="fl">Yönetici indirim (%)</div>
                  <input class="fi" type="number" id="inp-yonetici-indirim" min="0" max="100" placeholder="0" oninput="Pirim.calcAuto()">
                </div>
                <div class="fr" style="flex:1"><div class="fl">Fiyat avantajı (₺)</div>
                  <input class="fi" type="number" id="inp-fiyat-avantaji" min="0" placeholder="0" oninput="Pirim.calcAuto()">
                </div>
              </div>
            </div>
          </div>
        </div>
        <div style="padding:12px 22px 16px;border-top:1px solid var(--b);display:flex;justify-content:space-between;background:var(--s2)">
          <button class="btn" onclick="window.closeMo?.('mo-pirim')">İptal</button>
          <button class="btn btnp" onclick="Pirim.save()" style="padding:9px 24px">💾 Onaya Gönder</button>
        </div>
      </div>`;
    document.body.appendChild(mo);
  }
}
window._ensurePirimModals = _ensurePirimModals;

// ── Bonus/Ceza badge render yardımcısı ─────────────────────────
function _renderBcBadges(bc) {
  if (!bc) return '';
  var h = '<div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:2px">';
  if (bc.gecikmeGun > 0)
    h += '<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:#FCEBEB;color:#791F1F">-' + (bc.gecikmeGun >= 3 ? '20' : '10') + '% gecikme</span>';
  if (bc.yeniUrun)
    h += '<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:#EAF3DE;color:#15803D">+yeni ürün</span>';
  if (bc.caprazSatis)
    h += '<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:#EAF3DE;color:#15803D">+çapraz satış</span>';
  if (bc.yoneticiIndirimOran > 0)
    h += '<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:#FAEEDA;color:#92400E">-' + (bc.yoneticiIndirimOran * 100).toFixed(0) + '% indirim</span>';
  h += '</div>';
  return h;
}

// ── Toplu işlem yardımcıları ────────────────────────────────────
window._pirimBulkCheck = function() {
  var checked = document.querySelectorAll('.pirim-row-chk:checked');
  var actions = document.getElementById('prm-bulk-actions');
  var cnt = document.getElementById('prm-bulk-cnt');
  if (actions) actions.style.display = checked.length ? 'flex' : 'none';
  if (cnt) cnt.textContent = checked.length + ' prim';
};

window._pirimBulkClear = function() {
  document.querySelectorAll('.pirim-row-chk').forEach(function(cb) { cb.checked = false; });
  var actions = document.getElementById('prm-bulk-actions');
  if (actions) actions.style.display = 'none';
};

window._pirimBulkPay = function() {
  var checked = document.querySelectorAll('.pirim-row-chk:checked');
  var ids = Array.from(checked).map(function(cb) { return parseInt(cb.dataset.id); });
  if (!ids.length) return;
  window.confirmModal?.(ids.length + ' prim "ödendi" olarak işaretlenecek.', {
    title: 'Toplu Ödeme', confirmText: 'Evet, Öde',
    onConfirm: function() {
      var d = window.loadPirim?.() || [];
      d.forEach(function(p) {
        if (ids.indexOf(p.id) !== -1 && p.status === 'approved') {
          p.status = 'paid'; p.paidAt = new Date().toISOString();
        }
      });
      window.storePirim?.(d);
      window._pirimBulkClear?.();
      renderPirim();
      window.toast?.(ids.length + ' prim ödendi ✓', 'ok');
      window.logActivity?.('pirim', 'Toplu ödeme: ' + ids.length + ' prim');
    }
  });
};

window._pirimTopluSil = function() {
  if (!window._yetkiKontrol?.('toplu_sil')) return;
  var checked = document.querySelectorAll('.pirim-row-chk:checked');
  var ids = Array.from(checked).map(function(cb) { return parseInt(cb.dataset.id); });
  if (!ids.length) return;
  window.confirmModal?.(ids.length + ' prim kaydı silinecek?', {
    title: 'Toplu Sil', danger: true, confirmText: 'Evet, Sil',
    onConfirm: function() {
      var raw = JSON.parse(localStorage.getItem('ak_pirim1') || '[]');
      ids.forEach(function(id) {
        var x = raw.find(function(p) { return p.id === id; });
        if (x) { x.isDeleted = true; x.deletedAt = new Date().toISOString(); }
      });
      window.storePirim?.(raw);
      window._pirimBulkClear?.();
      renderPirim();
      window.toast?.(ids.length + ' prim silindi ✓', 'ok');
      window.logActivity?.('pirim', 'Toplu silme: ' + ids.length + ' prim');
    }
  });
};

function _injectPirimPanel() {
  _ensurePirimModals(); // Tüm modalleri DOM'a hazırla
  const panel = window.g('panel-pirim');
  if (!panel || panel.dataset.injected) return;
  panel.dataset.injected = '1';
  panel.innerHTML = `

<!-- TOPBAR -->
<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:0.5px solid var(--color-border-tertiary);background:var(--color-background-primary);position:sticky;top:0;z-index:200">
  <div>
    <div style="font-size:14px;font-weight:700;color:var(--t)">⭐ Prim & Teşvik Sistemi</div>
    <div style="font-size:10px;color:var(--t3)" id="prm-sub">Yükleniyor...</div>
  </div>
  <div style="display:flex;gap:6px;align-items:center">
    <button class="btn btns" onclick="Pirim.openSimulator()" style="font-size:11px">🧮 Simülatör</button>
    <button class="btn btns" onclick="Pirim.openPenaltyCalc()" style="font-size:11px">⚠️ Ceza</button>
    <button class="btn btns" onclick="Pirim.openCalendar()" style="font-size:11px">📅 Takvim</button>
    <button class="btn btns" onclick="Pirim.openGlossary()" style="font-size:11px">📖 Sözlük</button>
    <button class="btn btns" onclick="Pirim.showPdf()" style="font-size:11px">📄 Yönetmelik</button>
    <button class="btn btns" onclick="Pirim.exportXlsx()" style="font-size:11px">⬇ Excel</button>
    <button class="btn btns" onclick="Pirim.openParams()" style="font-size:11px">⚙️</button>
    <button class="btn btnp" onclick="Pirim.openModal(null)" style="font-size:12px;font-weight:600">+ Prim Ekle</button>
  </div>
</div>

<!-- SOL PANEL WRAPPER -->
<div style="display:flex;min-height:600px">
<div style="width:180px;flex-shrink:0;background:#fff;border-right:1px solid #e5e5e5;padding:12px 8px">
${[['primlerim','🏆 Primlerim'],['hesapla','📊 Hesapla'],['yonetmelik','📜 Yönetmelik'],['sozluk','📖 Sözlük'],['hedefler','🎯 Hedefler'],['liderlik','👑 Liderlik']].map(function(c){return '<button onclick="window._primNavClick?.(\''+c[0]+'\')" class="prm-nav-btn" data-nav="'+c[0]+'" style="display:block;width:100%;text-align:left;padding:10px 12px;border:none;border-radius:8px;background:transparent;color:#333;font-weight:400;cursor:pointer;margin-bottom:4px;font-family:inherit;font-size:12px">'+c[1]+'</button>';}).join('')}
</div>
<div style="flex:1;overflow-y:auto">

<!-- BENTO METRİKLER -->
<div style="display:grid;grid-template-columns:repeat(7,1fr);border-bottom:1px solid var(--b)">
  <div style="padding:14px 18px;border-right:1px solid var(--b)">
    <div style="font-size:10px;color:var(--t3);margin-bottom:4px">Toplam Kayıt</div>
    <div style="font-size:22px;font-weight:600;color:var(--t)" id="prm-stat-total">0</div>
  </div>
  <div id="prm-bento-pending" style="padding:14px 18px;border-right:1px solid var(--b);cursor:pointer" onclick="window.g('prm-status-f').value='pending';Pirim.render()">
    <div style="font-size:10px;color:var(--t3);margin-bottom:4px">⏳ Onay Bekliyor</div>
    <div style="font-size:22px;font-weight:600;color:#D97706" id="prm-stat-pending">0</div>
    <div style="font-size:9px;color:var(--t3);margin-top:2px">Hemen gözden geçir</div>
  </div>
  <div style="padding:14px 18px;border-right:1px solid var(--b)">
    <div style="font-size:10px;color:var(--t3);margin-bottom:4px">✅ Onaylandı</div>
    <div style="font-size:22px;font-weight:600;color:#10B981" id="prm-stat-approved">0</div>
  </div>
  <div style="padding:14px 18px;border-right:1px solid var(--b)">
    <div style="font-size:10px;color:var(--t3);margin-bottom:4px">💸 Ödendi</div>
    <div style="font-size:22px;font-weight:600;color:#6366F1" id="prm-stat-paid">0</div>
  </div>
  <div style="padding:14px 18px;border-right:1px solid var(--b)">
    <div style="font-size:10px;color:var(--t3);margin-bottom:4px">Toplam Onaylı</div>
    <div style="font-size:22px;font-weight:600;color:var(--ac)" id="prm-stat-amount">0 ₺</div>
  </div>
  <div style="padding:14px 18px;border-right:1px solid var(--b)">
    <div style="font-size:10px;color:var(--t3);margin-bottom:4px">🔥 Seri</div>
    <div style="font-size:22px;font-weight:600;color:#F59E0B" id="prm-stat-streak">0</div>
    <div id="prm-streak-mini" style="display:flex;gap:2px;margin-top:4px"></div>
  </div>
  <div style="padding:14px 18px">
    <div style="font-size:10px;color:var(--t3);margin-bottom:4px">Bu Ay Tahmini</div>
    <div style="font-size:22px;font-weight:600;color:#8B5CF6" id="prm-stat-forecast">0 ₺</div>
  </div>
</div>

<!-- KİŞİSEL BANNER (personel için) -->
<div id="prm-personal-banner" style="display:none;margin:16px 20px;background:linear-gradient(135deg,#1e1b4b,#3730a3);border-radius:12px;padding:18px 22px;color:#fff">
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
    <div>
      <div style="font-size:11px;opacity:.7;margin-bottom:4px">Bu ay kazandığın prim</div>
      <div style="font-size:28px;font-weight:800" id="prm-my-month">0 ₺</div>
    </div>
    <div style="display:flex;gap:20px">
      <div style="text-align:center">
        <div style="font-size:18px;font-weight:700" id="prm-my-total">0 ₺</div>
        <div style="font-size:10px;opacity:.6">Tüm zamanlar</div>
      </div>
      <div style="text-align:center">
        <div style="font-size:18px;font-weight:700;color:#FCD34D" id="prm-my-pending">0</div>
        <div style="font-size:10px;opacity:.6">Bekleyen</div>
      </div>
      <div style="text-align:center">
        <div style="font-size:18px;font-weight:700;color:#6EE7B7" id="prm-my-rank">#—</div>
        <div style="font-size:10px;opacity:.6">Sıralama</div>
      </div>
      <div style="text-align:center">
        <div style="font-size:18px;font-weight:700" id="prm-my-streak">0🔥</div>
        <div style="font-size:10px;opacity:.6">Seri</div>
      </div>
    </div>
  </div>
  <!-- Aylık progress bar -->
  <div style="margin-top:12px">
    <div style="display:flex;justify-content:space-between;font-size:10px;opacity:.7;margin-bottom:4px">
      <span>Aylık hedef ilerlemesi</span>
      <span id="prm-my-goal-pct">0%</span>
    </div>
    <div style="height:6px;background:rgba(255,255,255,.2);border-radius:99px;overflow:hidden">
      <div id="prm-my-goal-bar" style="height:100%;width:0%;background:#6EE7B7;border-radius:99px;transition:width .5s"></div>
    </div>
  </div>
</div>

<!-- FİLTRE SATIRI -->
<div style="padding:8px 16px;border-bottom:1px solid var(--b);display:flex;gap:8px;flex-wrap:wrap;align-items:center;background:var(--s2)">
  <select class="fi" id="prm-period-f" style="width:130px;font-size:11px" onchange="Pirim.render()">
    <option value="">Tüm Dönemler</option>
    <option value="thismonth">Bu Ay</option>
    <option value="lastmonth">Geçen Ay</option>
    <option value="q1">Q1</option><option value="q2">Q2</option>
    <option value="q3">Q3</option><option value="q4">Q4</option>
    <option value="thisyear">Bu Yıl</option>
  </select>
  <select class="fi" id="prm-status-f" style="width:130px;font-size:11px" onchange="Pirim.render()">
    <option value="">Tüm Durumlar</option>
    <option value="pending">⏳ Bekliyor</option>
    <option value="approved">✅ Onaylı</option>
    <option value="rejected">❌ Reddedildi</option>
    <option value="paid">💸 Ödendi</option>
  </select>
  <select class="fi" id="prm-type-f" style="width:140px;font-size:11px" onchange="Pirim.render()">
    <option value="">Tüm Türler</option>
    ${Object.entries(PIRIM_TYPES).map(([k,v]) => `<option value="${k}">${v.emoji} ${v.label}</option>`).join('')}
  </select>
  <select class="fi" id="prm-user-f" style="width:130px;font-size:11px" onchange="Pirim.render()">
    <option value="0">Tüm Personel</option>
  </select>
  <input class="fi" id="prm-search" style="flex:1;min-width:120px;font-size:11px" placeholder="🔍 Ara..." oninput="Pirim.render()">
  <button class="btn btns" onclick="Pirim.clearFilters()" style="font-size:11px">✕</button>
  <span id="prm-bulk-actions" style="display:none;gap:6px;align-items:center">
    <span id="prm-bulk-cnt" style="font-size:10px;font-weight:600;color:var(--ac)">0</span>
    <button class="btn btns btng" onclick="event.stopPropagation();window.bulkApprovePirim?.()" style="font-size:10px">✓ Onayla</button>
    <button class="btn btns" onclick="event.stopPropagation();window._pirimBulkPay?.()" style="font-size:10px;color:var(--bl)">💸 Öde</button>
    <button class="btn btns btnd" onclick="event.stopPropagation();window._pirimTopluSil?.()" style="font-size:10px">🗑 Sil</button>
    <button class="btn btns" onclick="event.stopPropagation();window._pirimBulkClear?.()" style="font-size:10px">İptal</button>
  </span>
  <button class="btn btns" onclick="event.stopPropagation();window.sendMonthlyPirimSummary?.()" style="font-size:11px">📊 Aylık Özet</button>
</div>

<!-- ANA İÇERİK: sol tablo + sağ panel -->
<div style="display:grid;grid-template-columns:1fr 260px;gap:0;align-items:start">

  <!-- TABLO ALANI -->
  <div style="border-right:1px solid var(--b)">
    <!-- Tablo başlığı -->
    <div style="display:grid;grid-template-columns:1fr 100px 140px 90px 100px 90px 130px;padding:6px 16px;background:var(--s2);border-bottom:1px solid var(--b)">
      <div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em">Personel</div>
      <div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em">Tür</div>
      <div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em">Açıklama</div>
      <div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em">Tutar</div>
      <div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em">Tarih</div>
      <div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em">Durum</div>
      <div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em">İşlem</div>
    </div>
    <div id="pirim-list"></div>
  </div>

  <!-- SAĞ PANEL -->
  <div style="display:flex;flex-direction:column">

    <!-- Liderlik -->
    <div style="border-bottom:1px solid var(--b);padding:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <span style="font-size:12px;font-weight:600">🏆 Liderlik</span>
        <select style="font-size:10px;padding:2px 6px;border:1px solid var(--b);border-radius:6px;background:var(--sf);color:var(--t)" id="prm-lb-period" onchange="Pirim.renderLeaderboard()">
          <option value="month">Bu Ay</option>
          <option value="quarter">Çeyrek</option>
          <option value="year">Yıl</option>
          <option value="all">Tümü</option>
        </select>
      </div>
      <div id="pirim-leaderboard"></div>
    </div>

    <!-- Yaklaşan ödemeler -->
    <div style="border-bottom:1px solid var(--b);padding:14px">
      <div style="font-size:12px;font-weight:600;margin-bottom:8px">📅 Yaklaşan Ödemeler</div>
      <div id="pirim-upcoming"></div>
    </div>

    <!-- Trend -->
    <div style="padding:14px">
      <div style="font-size:12px;font-weight:600;margin-bottom:8px">📈 Aylık Trend</div>
      <div id="pirim-trend"></div>
    </div>

  </div>
</div>
</div></div>`;

window._primNavClick = function(cat) {
  window._primActiveCat = cat;
  if (cat === 'yonetmelik') { Pirim.showPdf?.(); }
  else if (cat === 'sozluk') { Pirim.openGlossary?.(); }
  else if (cat === 'hedefler') { Pirim.openGoal?.(); }
  else if (cat === 'liderlik') { Pirim.renderLeaderboard?.(); }
  else if (cat === 'hesapla') { Pirim.openModal?.(null); }
  document.querySelectorAll('.prm-nav-btn').forEach(function(b) {
    var active = b.dataset.nav === cat;
    b.style.background = active ? '#EBF2FF' : 'transparent';
    b.style.color = active ? '#007AFF' : '#333';
    b.style.fontWeight = active ? '600' : '400';
  });
};
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 2 — RENDER
// ════════════════════════════════════════════════════════════════
function renderPirim() {
  _injectPirimPanel();
  // Hak kayıp kontrolü — süresi dolan onaylı primleri iptal et
  checkPirimExpiry();

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

  // Streak göstergesi
  const cuStreak = cu ? calcPirimStreak(cu.id) : 0;
  window.st('prm-stat-streak', cuStreak + '🔥');
  const miniBar = window.g('prm-streak-mini');
  if (miniBar) {
    let miniH = '';
    for (let si = 0; si < 7; si++) {
      miniH += '<div style="width:8px;height:8px;border-radius:2px;background:' + (si < cuStreak ? '#F59E0B' : 'var(--s2)') + '"></div>';
    }
    miniBar.innerHTML = miniH;
  }

  // Forecast (bu ay tahmini)
  const now2   = new Date();
  const mKey2  = now2.getFullYear() + '-' + _p2(now2.getMonth() + 1);
  const monthPirim = pirim.filter(p => (p.date || '').startsWith(mKey2));
  const forecastAmt = monthPirim.reduce((a, p) => a + (p.amount || 0), 0);
  window.st('prm-stat-forecast', forecastAmt.toLocaleString('tr-TR') + ' ₺');

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

  // ── Alt başlık güncelle ──────────────────────────────────────
  const subEl = window.g('prm-sub');
  if (subEl) {
    const now = new Date();
    subEl.textContent = now.toLocaleString('tr-TR',{month:'long',year:'numeric'}) + ' · ' + fl.length + ' kayıt';
  }

  const frag  = document.createDocumentFragment();
  const cont2 = window.g('pirim-list'); if (!cont2) return;

  /* Sayfalama (STANDART-FIX-009) */
  fl.sort((a,b) => (b.date||'').localeCompare(a.date||''));
  if (!window._pirimSayfa) window._pirimSayfa = 1;
  const _PIRIM_SAYFA_BOY = 50;
  const _pirimToplamS = Math.max(1, Math.ceil(fl.length / _PIRIM_SAYFA_BOY));
  if (window._pirimSayfa > _pirimToplamS) window._pirimSayfa = _pirimToplamS;
  const _pirimBas = (window._pirimSayfa - 1) * _PIRIM_SAYFA_BOY;
  const sayfaPirim = fl.slice(_pirimBas, _pirimBas + _PIRIM_SAYFA_BOY);

  sayfaPirim.forEach(p => {
    const u    = users.find(x => x.id === p.uid) || { name: '?' };
    const st2  = PIRIM_STATUS[p.status] || PIRIM_STATUS.pending;
    const td   = PIRIM_TYPES[p.type];
    const payD = p.payDate || _calcExpiry(p.date);
    const over = p.status !== 'paid' && payD < new Date().toISOString().slice(0,10);
    const row  = document.createElement('div');
    row.style.cssText = 'display:grid;grid-template-columns:1fr 100px 140px 90px 100px 90px 130px;padding:10px 16px;border-bottom:1px solid var(--b);align-items:center;' + (over ? 'background:rgba(239,68,68,.03)' : '');
    row.onmouseenter = function() { this.style.background = 'var(--s2)'; };
    row.onmouseleave = function() { this.style.background = over ? 'rgba(239,68,68,.03)' : ''; };
    row.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px">
        ${admin ? '<input type="checkbox" class="pirim-row-chk" data-id="' + p.id + '" onclick="event.stopPropagation();window._pirimBulkCheck?.()" style="width:14px;height:14px;cursor:pointer;accent-color:var(--ac)">' : ''}
        <div>
        <div style="font-weight:600;font-size:12px;color:var(--t)">${window._esc(u.name||'')}</div>
        ${p.code ? `<div style="font-size:9px;color:var(--t3);font-family:'DM Mono',monospace">${window._esc(p.code)}</div>` : ''}
      </div></div>
      <div><span style="font-size:10px;padding:2px 7px;border-radius:99px;background:var(--alb);color:var(--ac)">${td?.emoji || ''} ${td?.label || p.type}</span></div>
      <div>
        <div style="font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px" title="${window._esc(p.title||'')}">${window._esc(p.title || '—')}</div>
        ${p.note ? `<div style="font-size:10px;color:var(--t3)">${window._esc(p.note.slice(0,30))}</div>` : ''}
        ${_renderBcBadges(p.bonusCeza)}
      </div>
      <div style="font-weight:700;font-size:12px;font-family:'DM Mono',monospace;color:var(--ac)">${_fmt(p.amount)}</div>
      <div style="font-size:11px;font-family:'DM Mono',monospace;color:var(--t2)">${p.date||'—'}</div>
      <div>
        <span class="badge ${st2.c}" style="font-size:10px">${st2.emoji} ${st2.l}</span>
        ${p.status === 'peer_review' && p.peerUser ? `<div style="font-size:9px;color:var(--t3);margin-top:1px">👤 ${window._esc((users.find(x=>x.id===p.peerUser)||{name:'?'}).name)}</div>` : ''}
      </div>
      <td>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          ${/* Admin: pending → Onayla / Yönlendir / Reddet */
            admin && p.status === 'pending' ? `
            <button class="btn btns btng" onclick="Pirim.approve(${p.id})" style="font-size:11px" title="Onayla">✓ Onayla</button>
            <button class="btn btns" onclick="Pirim.openPeer(${p.id})" style="font-size:11px;color:var(--bl)" title="Önce başka biri onaylasın">👤 Yönlendir</button>
            <button class="btn btns btnd" onclick="Pirim.reject(${p.id})" style="font-size:11px" title="Reddet">✕</button>` : ''}
          ${/* Peer (ikinci onayçı): kendi adına atanmış ara onay */
            !admin && cu && p.status === 'peer_review' && p.peerUser === cu.id ? `
            <button class="btn btns btng" onclick="Pirim.peerApprove(${p.id})" style="font-size:11px">✓ Onayla</button>
            <button class="btn btns btnd" onclick="Pirim.peerReject(${p.id})"  style="font-size:11px">✕ Reddet</button>` : ''}
          ${/* Admin: peer_review tamamlandı → nihai onay */
            admin && p.status === 'peer_review' && p.peerApprovedAt ? `
            <div style="font-size:10px;color:var(--gr);margin-bottom:2px;width:100%">👤 Ara onay verildi</div>
            <button class="btn btns btng" onclick="Pirim.approve(${p.id})" style="font-size:11px">✓ Nihai Onayla</button>
            <button class="btn btns btnd" onclick="Pirim.reject(${p.id})" style="font-size:11px">✕</button>` : ''}
          ${/* Admin: approved → Ödendi */
            admin && p.status === 'approved' ? `
            <button class="btn btns" style="font-size:11px;color:var(--bl)" onclick="Pirim.markPaid(${p.id})">💸 Ödendi</button>` : ''}
          <button class="btn btns" onclick="Pirim.showDetail(${p.id})" style="font-size:11px" title="Detay">🔍</button>
          <button class="btn btns" onclick="event.stopPropagation();window.printPirimSlip?.(${p.id})" style="font-size:11px" title="PDF Slip">🖨</button>
          ${admin || (p.uid === cu?.id && p.status === 'pending') ? `<button class="btn btns" onclick="Pirim.openModal(${p.id})" style="font-size:11px">✏️</button>` : ''}
          ${!admin && cu && p.uid === cu.id && p.status === 'rejected' ? `<button class="btn btns" style="font-size:11px;color:var(--ac)" onclick="Pirim.resubmit(${p.id})" title="Düzenleyip tekrar gönder">↩ Tekrar Gönder</button>` : ''}
          ${admin ? `<button class="btn btns btnd" onclick="Pirim.del(${p.id})" style="font-size:11px">🗑</button>` : ''}
        </div>
      </td>`;
    frag.appendChild(row);
  });
  cont2.replaceChildren(frag);

  /* Sayfalama footer */
  if (fl.length > _PIRIM_SAYFA_BOY) {
    var pgEl = document.createElement('div');
    pgEl.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px 16px;font-size:10px;color:var(--t3);border-top:1px solid var(--b)';
    pgEl.innerHTML = '<span>' + (_pirimBas + 1) + '–' + Math.min(_pirimBas + _PIRIM_SAYFA_BOY, fl.length) + ' / ' + fl.length + ' pirim</span>'
      + '<div style="display:flex;gap:4px">'
      + '<button class="btn btns" onclick="event.stopPropagation();window._pirimSayfa=Math.max(1,window._pirimSayfa-1);Pirim.render()" style="font-size:10px;padding:2px 8px"' + (window._pirimSayfa <= 1 ? ' disabled' : '') + '>\u2190</button>'
      + '<button class="btn btns" onclick="event.stopPropagation();window._pirimSayfa=Math.min(' + _pirimToplamS + ',window._pirimSayfa+1);Pirim.render()" style="font-size:10px;padding:2px 8px"' + (window._pirimSayfa >= _pirimToplamS ? ' disabled' : '') + '>\u2192</button>'
      + '</div>';
    cont2.parentNode?.insertBefore(pgEl, cont2.nextSibling);
  }

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
  const cuLb = window.CU();
  const isAdminLb = window.isAdmin?.();
  // Non-admin: sadece kendi sıralamasını görsün (isimsiz)
  const myRank = sorted.findIndex(([uid]) => parseInt(uid) === cuLb?.id);
  cont.innerHTML = sorted.map(([uid, amt], i) => {
    const u  = users.find(x => x.id === parseInt(uid)) || { name: '?' };
    const isMe = parseInt(uid) === cuLb?.id;
    const showName = isAdminLb || isMe;
    const displayName = showName ? window._esc(u.name) + (isMe ? ' (sen)' : '') : `Kullanıcı #${i+1}`;
    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--b);${isMe?'background:rgba(99,102,241,.05);border-radius:8px;padding:8px;margin:-0 -4px;':''}">
      <span style="font-size:16px;width:22px;text-align:center">${medals[i] || `${i+1}`}</span>
      <div style="width:28px;height:28px;border-radius:50%;background:var(--al);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--ac);flex-shrink:0">${showName ? window._esc((u.name||'?')[0]) : '?'}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:${isMe?'700':'500'};color:var(--t);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${displayName}</div>
      </div>
      <div style="font-size:12px;font-weight:700;font-family:'DM Mono',monospace;color:var(--ac)">${isAdminLb || isMe ? amt.toLocaleString('tr-TR') + ' ₺' : '***'}</div>
    </div>`;
  }).join('') + (!isAdminLb && myRank < 0 ? '<div style="padding:8px;font-size:11px;color:var(--t3);text-align:center">Bu dönemde henüz priminiz yok</div>' : '');
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
        <div style="font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${window._esc(u.name||'')}</div>
        <div style="font-size:10px;color:var(--t3)">${window._esc(p.title||'—')}</div>
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
  _ensurePirimModals();
  _injectPirimPanel();
  const users = window.loadUsers?.() || [];
  const cu    = window.CU();
  const admin = window.isAdmin?.();
  const usel  = window.g('prm-user');

  // Personel kısıtı: admin/yönetici tüm personeli görür, user sadece kendisini
  if (usel) {
    if (admin) {
      usel.innerHTML = users.map(u => `<option value="${u.id}">${window._esc(u.name)}</option>`).join('');
      usel.disabled = false;
    } else {
      usel.innerHTML = `<option value="${cu?.id}">${window._esc(cu?.name || 'Ben')}</option>`;
      usel.disabled = true;
    }
  }
  // Personel satırını gizle/göster
  const uidRow = window.g('prm-uid-row');
  if (uidRow) {
    if (admin) {
      uidRow.style.display = '';
    } else {
      uidRow.style.display = 'none'; // kullanıcı kendi adına otomatik kaydeder
    }
  }

  // Görev ID seçicisini doldur
  const taskSel = window.g('prm-taskid');
  if (taskSel) {
    const tasks = typeof loadTasks === 'function' ? loadTasks() : [];
    const myTasks = admin ? tasks : tasks.filter(t => t.uid === cu?.id);
    const activeTasks = myTasks.filter(t => !t.done && t.status !== 'done').slice(0, 50);
    taskSel.innerHTML = '<option value="">— Görev seçin —</option>'
      + activeTasks.map(t => `<option value="${t.id}">${window._esc(t.title)} ${t.due ? '(📅 ' + t.due + ')' : ''}</option>`).join('');
  }
  const taskInfo = window.g('prm-task-info');
  if (taskInfo) { taskInfo.style.display = 'none'; taskInfo.innerHTML = ''; }

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
    if (window.g('prm-taskid')) window.g('prm-taskid').value = p.taskId || '';
    if (p.taskId) window._pirimTaskSelected?.();
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

  const td     = PIRIM_TYPES[type];
  const oranEl = window.g('prm-oran');
  const hintEl = window.g('prm-rate-hint');
  const isAlim = td?.base === 'alim';

  // Admin'in kaydettiği parametrelerden bu tipe ait oranı bul
  const params   = window.loadPirimParams?.() || {};
  const typeRate = params.typeRates?.[type]; // ör: { rate: 0.005 }

  if (isAlim) {
    // Kademe tabanlı → oran tutara göre otomatik hesaplanır
    if (oranEl) {
      oranEl.readOnly = true;
      oranEl.style.background = 'var(--s2)';
      oranEl.style.color      = 'var(--t2)';
      oranEl.value = '';
    }
    if (hintEl) hintEl.textContent = 'Kademe otomatik';
  } else {
    // Serbest tip → admin'in belirlediği sabit oran varsa doldur, yoksa manuel
    if (oranEl) {
      if (typeRate?.rate != null) {
        oranEl.value    = (typeRate.rate * 100).toFixed(2);
        oranEl.readOnly = true;
        oranEl.style.background = 'var(--s2)';
        oranEl.style.color      = 'var(--t2)';
        if (hintEl) hintEl.textContent = `Yönetici: %${(typeRate.rate * 100).toFixed(2)}`;
      } else {
        // Admin değilse oran alanı her zaman readonly
        const adminCheck = window.isAdmin?.() || false;
        oranEl.readOnly = !adminCheck;
        oranEl.style.background = adminCheck ? '' : 'var(--s2)';
        oranEl.style.color      = adminCheck ? '' : 'var(--t3)';
        oranEl.title = adminCheck ? '' : 'Prim oranı yalnızca yönetici tarafından belirlenebilir';
        if (hintEl) hintEl.textContent = adminCheck ? 'Manuel giriş (yönetici)' : 'Yönetici tarafından belirlenir';
      }
    }
  }

  // Bonus/ceza paneli sadece alım tiplerinde
  const bonusPanel = window.g('prm-bonus-panel');
  if (bonusPanel) bonusPanel.style.display = isAlim ? 'block' : 'none';

  calcPirimAuto();
}

function calcPirimAuto() {
  const type = window.g('prm-type')?.value;
  const td   = PIRIM_TYPES[type] || {};
  const base = parseFloat(window.g('prm-base-amount')?.value || '0') || 0;

  // Admin parametrelerinden güncel tier tablolarını al (yoksa varsayılan)
  const params = window.loadPirimParams?.() || {};

  if (td.base === 'alim' && ['NA','SC','YT'].includes(type)) {
    // Kademeli hesaplama — admin'in kaydettiği tier'ları kullan
    const adminTiersNA = params.tiersNA || TIER_YENI_AVCI;
    const adminTiersSC = params.tiersSC || TIER_SADIK_CIFTCI;
    const adminMult    = params.multipliers || {};

    const opts = {
      yeniTedarikci:       window.g('chk-yeni-tedarikci')?.checked,
      caprazSatis:         window.g('chk-capraz')?.checked,
      yeniUrun:            window.g('chk-yeni-urun')?.checked,
      tamamlayiciIhmal:    window.g('chk-tamamlayici-ihmal')?.checked,
      revizyonPenalty:     window.g('chk-revizyon')?.checked,
      gecikmeGun:          parseInt(window.g('inp-gecikme-gun')?.value  || '0') || 0,
      yoneticiIndirimOran: parseFloat(window.g('inp-yonetici-indirim')?.value || '0') / 100 || 0,
      fiyatAvantajiTL:     parseFloat(window.g('inp-fiyat-avantaji')?.value  || '0') || 0,
      // Bonus çarpanlarını admin'in değerlerinden al
      multYeniTedarikci:   adminMult.yeniTedarikci   ?? 0.15,
      multCapraz:          adminMult.capraz           ?? 0.25,
      multYeniUrun:        adminMult.yeniUrun         ?? 0.25,
      multFiyatAvantaji:   adminMult.fiyatAvantaji    ?? 0.30,
      multTamamlayici:     adminMult.tamamlayiciIhmal ?? 0.30,
      multRevizyon:        adminMult.revizyon         ?? 0.07,
      tiersNA:             adminTiersNA,
      tiersSC:             adminTiersSC,
    };

    const result = calcSatinalimaPrim(base, type, opts);
    const oranEl = window.g('prm-oran');
    const hintEl = window.g('prm-rate-hint');
    if (oranEl) oranEl.value = (result.appliedRate * 100).toFixed(3);
    if (hintEl) hintEl.textContent = `Kademe: ${result.tier}`;
    if (window.g('prm-total')) window.g('prm-total').value = result.gross || '';

    // Hesaplama özet kutusu
    const detDiv = window.g('prm-calc-detail');
    if (detDiv) {
      const lines = result.breakdown.map(b => `${b.positive ? '✅' : '❌'} ${b.label}`).join('<br>');
      detDiv.innerHTML = base > 0 ? `
        <div style="font-size:11px;color:var(--t2);margin-top:8px;padding:8px 12px;background:var(--sf);border-radius:8px;line-height:1.8;border:1px solid var(--b)">
          <strong>📊 Hesaplama Özeti</strong><br>
          Kademe: <strong>${result.tier}</strong> → Uygulanan Oran: <strong>%${(result.appliedRate*100).toFixed(3)}</strong><br>
          ${lines ? lines + '<br>' : ''}
          <span style="color:var(--ac);font-weight:700">Net Prim: ${_fmtTL(result.gross)}</span>
        </div>` : '';
      detDiv.style.display = base > 0 ? 'block' : 'none';
    }
  } else {
    // Serbest tip: admin'in belirlediği sabit oran veya manuel
    const rate  = parseFloat(window.g('prm-oran')?.value || '0') || 0;
    const total = base && rate ? Math.round(base * rate / 100 * 100) / 100 : 0;
    if (window.g('prm-total')) window.g('prm-total').value = total || '';
    const detDiv = window.g('prm-calc-detail');
    if (detDiv) {
      detDiv.innerHTML = base > 0 && rate > 0 ? `
        <div style="font-size:11px;color:var(--t2);margin-top:8px;padding:8px 12px;background:var(--sf);border-radius:8px;border:1px solid var(--b)">
          ${_fmtTL(base)} × %${rate} = <strong style="color:var(--ac)">${_fmtTL(total)}</strong>
        </div>` : '';
      detDiv.style.display = (base > 0 && rate > 0) ? 'block' : 'none';
    }
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

  // Personel kısıtı: user kendi uid'sini kullanır
  if (!window.isAdmin?.()) {
    const myId = window.CU()?.id;
    if (uid !== myId) { window.toast?.('Sadece kendi priminizi hesaplayabilirsiniz', 'err'); return; }
  }

  const d     = window.loadPirim?.() || [];
  const entry = {
    type, title, amount, date, uid,
    taskId:     parseInt(window.g('prm-taskid')?.value || '0') || null,
    code:       (window.g('prm-code')?.value || '').trim(),
    note:       (window.g('prm-note')?.value || '').trim(),
    rate:       parseFloat(window.g('prm-oran')?.value || '0') || 0,
    baseAmount: parseFloat(window.g('prm-base-amount')?.value || '0') || 0,
    payDate:    _calcExpiry(date),
    status:     'pending', // Her zaman onay bekliyor olarak gönderilir
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
    d.push({ id: generateNumericId(), ...entry });
  }

  window.storePirim?.(d);
  window.closeMo?.('mo-pirim');
  renderPirim();
  window.logActivity?.('view', `Prim kaydedildi: "${title}" — ${_fmt(amount)}`);
  window.toast?.('Prim onaya gönderildi ✓', 'ok');
  // Yöneticilere sistem bildirimi
  window.addNotif?.('⭐', '"' + title + '" — ' + _fmt(amount) + ' prim onay bekliyor', 'warn', 'pirim');
  // Ödemeler paneli de haberdar olsun
  window.addNotif?.('⭐', '"' + title + '" prim onaylanırsa ödeme planına alınacak', 'info', 'odemeler');
  _pirimDuyur('⭐ Yeni Prim Onay Bekliyor', '"' + title + '" — ' + _fmt(amount) + ' tutarındaki prim yönetici onayı bekliyor.', 'warn');
}

// ── Görev ID seçilince tarih otomatik doldur ──────────────────────
/**
 * @description Görev seçildiğinde başlangıç/bitiş tarihi ve bilgi gösterir.
 */
window._pirimTaskSelected = function() {
  var taskSel = window.g('prm-taskid');
  var info    = window.g('prm-task-info');
  var dateEl  = window.g('prm-date');
  if (!taskSel) return;

  var taskId = parseInt(taskSel.value || '0');
  if (!taskId) {
    if (info) { info.style.display = 'none'; info.innerHTML = ''; }
    return;
  }

  var tasks = typeof loadTasks === 'function' ? loadTasks() : [];
  var task  = tasks.find(function(t) { return t.id === taskId; });
  if (!task) {
    if (info) { info.style.display = 'none'; }
    return;
  }

  // Tarih otomatik doldur (mevcut boşsa)
  if (dateEl && !dateEl.value) {
    dateEl.value = task.due || task.start || new Date().toISOString().slice(0, 10);
  }

  // Bilgi göster
  if (info) {
    var esc = window._esc;
    var statusTxt = task.done ? '✅ Tamamlandı' : (task.status === 'inprogress' ? '🔄 Devam' : '📋 Bekliyor');
    info.innerHTML = '📌 <b>' + esc(task.title) + '</b>'
      + (task.start ? ' · Başlangıç: ' + task.start : '')
      + (task.due ? ' · Bitiş: ' + task.due : '')
      + ' · ' + statusTxt;
    info.style.display = 'block';
  }

  // Satınalma baz tutarı otomatik doldur (KDV hariç tutar)
  var baseEl = window.g('prm-base-amount');
  if (baseEl && !baseEl.value) {
    var saData = typeof loadSatinalma === 'function' ? loadSatinalma() : [];
    var matchSA = saData.find(function(sa) {
      return String(sa.jobId) === String(taskId) && sa.status === 'approved';
    });
    if (matchSA) {
      var kdvHaric = (parseFloat(matchSA.totalAmount) || 0) - (parseFloat(matchSA.kdv) || 0);
      baseEl.value = Math.round(kdvHaric * 100) / 100;
      if (info) info.innerHTML += '<br>💰 Satınalma KDV hariç: <b>₺' + kdvHaric.toLocaleString('tr-TR') + '</b>';
      if (typeof window.Pirim?.calcAuto === 'function') window.Pirim.calcAuto();
    }
  }
};

// ════════════════════════════════════════════════════════════════
// BÖLÜM 5 — ONAY AKIŞI
// pending → [peer_review] → approved → paid
// ════════════════════════════════════════════════════════════════

/** Admin: doğrudan onayla (peer review atla veya peer tamamlandıktan sonra nihai) */
function _doApprovePirim(d, p) {
  p.status         = 'approved';
  p.approvedBy     = window.CU()?.id;
  p.approvedAt     = _now();
  window.storePirim?.(d);
  renderPirim();
  window.toast?.('Prim onaylandı — ödeme planına alındı', 'ok');
  window.logActivity?.('view', `Prim onaylandı: "${p.title}" — ${_fmt(p.amount)}`);
  _pirimDuyur('Prim Onaylandı', '"' + (p.title||'') + '" — ' + _fmt(p.amount) + ' onaylandı ve ödeme planına alındı.', 'ok');
  if (window.createOdmFromPurchase) {
    window.createOdmFromPurchase({
      id:         p.id,
      name:       'Prim: ' + (p.title||''),
      totalAmount: p.amount,
      balanceDate: p.payDate || _calcExpiry(p.date),
      assignedTo:  p.uid,
    });
  } else {
    window.addNotif?.('💸', '"' + (p.title||'') + '" — ' + _fmt(p.amount) + ' ödeme planına eklendi', 'ok', 'odemeler');
  }
}

function approvePirim(id) {
  if (!window.isAdmin()) { window.toast?.('Yetki yok', 'err'); return; }
  const d = window.loadPirim?.() || [];
  const p = d.find(x => x.id === id); if (!p) return;

  // Peer review bekleniyorsa ve tamamlanmamışsa uyar
  if (p.status === 'peer_review' && !p.peerApprovedAt) {
    window.confirmModal(`"${p.title}" için ara onay henüz verilmedi. Yine de onaylamak istiyor musunuz?`, {
      title: 'Ara Onay Atla',
      danger: false,
      confirmText: 'Evet, Onayla',
      onConfirm: () => { _doApprovePirim(d, p); }
    });
    return;
  }

  _doApprovePirim(d, p);
}

/** Admin: ara onay modalını aç — başka kullanıcıya yönlendir */
function openPirimPeer(id) {
  if (!window.isAdmin()) { window.toast?.('Yetki yok', 'err'); return; }
  _ensurePirimModals();
  const peerIdEl = window.g('peer-pirim-id');
  if (peerIdEl) peerIdEl.value = id;

  // Kullanıcı listesini doldur (mevcut admin hariç)
  const sel   = window.g('peer-user-sel');
  const cu    = window.CU();
  const users = (window.loadUsers?.() || []).filter(u => u.id !== cu?.id && !u.admin);
  if (sel) {
    sel.innerHTML = `<option value="">— Kişi seçin —</option>` +
      users.map(u => `<option value="${u.id}">${window._esc(u.name)}</option>`).join('');
  }
  const noteEl = window.g('peer-note');
  if (noteEl) noteEl.value = '';
  window.openMo?.('mo-pirim-peer');
}

/** Admin: peer'a gönder */
function sendToPeer() {
  const id   = parseInt(window.g('peer-pirim-id')?.value || '0');
  const uid  = parseInt(window.g('peer-user-sel')?.value || '0');
  const note = (window.g('peer-note')?.value || '').trim();
  if (!uid) { window.toast?.('Kişi seçin', 'err'); return; }

  const d = window.loadPirim?.() || [];
  const p = d.find(x => x.id === id); if (!p) return;

  p.status        = 'peer_review';
  p.peerUser      = uid;
  p.peerNote      = note;
  p.peerSentAt    = _now();
  p.peerSentBy    = window.CU()?.id;
  p.peerApprovedAt = null;

  window.storePirim?.(d);
  window.closeMo?.('mo-pirim-peer');
  renderPirim();
  const u = (window.loadUsers?.() || []).find(x => x.id === uid);
  window.toast?.(`📨 ${u?.name || 'Kullanıcı'} onayına gönderildi`, 'ok');
  window.logActivity?.('view', `Prim ara onaya gönderildi: "${p.title}" → ${u?.name}`);
}

/** İkinci onayçı (peer): onaylar */
function peerApprovePirim(id) {
  const cu = window.CU();
  const d  = window.loadPirim?.() || [];
  const p  = d.find(x => x.id === id); if (!p) return;
  if (p.peerUser !== cu?.id) { window.toast?.('Bu kayıt size yönlendirilmemiş', 'err'); return; }

  p.peerApprovedAt = _now();
  p.peerApprovedBy = cu.id;
  // Durum peer_review kalır — admin nihai onayını bekler
  window.storePirim?.(d);
  renderPirim();
  window.toast?.('✅ Ara onay verildi. Admin nihai onaylayacak.', 'ok');
  window.logActivity?.('view', `Ara onay verildi: "${p.title}"`);
}

/** İkinci onayçı (peer): reddeder */
function peerRejectPirim(id) {
  const cu = window.CU();
  const d  = window.loadPirim?.() || [];
  const p  = d.find(x => x.id === id); if (!p) return;
  if (p.peerUser !== cu?.id) { window.toast?.('Bu kayıt size yönlendirilmemiş', 'err'); return; }

  const mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-peer-reject'; mo.style.zIndex = '2400';
  mo.innerHTML = `
    <div class="moc" style="max-width:420px">
      <div class="mt" style="color:#EF4444">❌ Ara Onay — Reddet</div>
      <div style="padding:8px 12px;background:var(--s2);border-radius:8px;margin-bottom:12px;font-size:12px">
        <b>${window._esc(p.title||'—')}</b> — ${_fmt(p.amount)}
      </div>
      <div class="fr"><div class="fl">RED NEDENİ *</div>
        <textarea class="fi" id="peer-reject-reason" rows="3" style="resize:none" placeholder="Açıklamanız..."></textarea>
      </div>
      <div class="mf">
        <button class="btn" onclick="document.getElementById('mo-peer-reject').remove()">İptal</button>
        <button class="btn btnp" style="background:#EF4444;border-color:#EF4444" onclick="_confirmPeerReject(${id})">Reddet</button>
      </div>
    </div>`;
  document.body.appendChild(mo);
  setTimeout(() => mo.classList.add('open'), 10);
}

function _confirmPeerReject(id) {
  const reason = (document.getElementById('peer-reject-reason')?.value || '').trim();
  if (!reason) { window.toast?.('Neden zorunludur', 'err'); return; }
  const cu = window.CU();
  const d  = window.loadPirim?.() || [];
  const p  = d.find(x => x.id === id); if (!p) return;
  p.status       = 'rejected';
  p.rejectedBy   = cu.id;
  p.rejectedAt   = _now();
  p.rejectReason = '[Ara Onay Red] ' + reason;
  window.storePirim?.(d);
  document.getElementById('mo-peer-reject')?.remove();
  renderPirim();
  window.toast?.('Ara onay reddedildi', 'ok');
  _pirimDuyur('❌ Ara Onay Reddedildi', '"' + (p.title||'') + '" ara onayda reddedildi. Neden: ' + reason, 'err');
  window.logActivity?.('view', `Ara onay reddedildi: "${p.title}"`);
}
window._confirmPeerReject = _confirmPeerReject;

/** Admin: red modal'ı aç */
function rejectPirim(id) {
  if (!window.isAdmin()) { window.toast?.('Yetki yok', 'err'); return; }
  const p = (window.loadPirim?.() || []).find(x => x.id === id); if (!p) return;

  const mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-pirim-reject'; mo.style.zIndex = '2400';
  mo.innerHTML = `
    <div class="moc" style="max-width:440px;padding:0;border-radius:14px;overflow:hidden">
      <div style="background:#EF4444;padding:14px 20px;color:#fff;display:flex;align-items:center;justify-content:space-between">
        <div style="font-size:14px;font-weight:600">❌ Prim Reddet</div>
        <button onclick="document.getElementById('mo-pirim-reject').remove()" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:7px;padding:3px 10px;cursor:pointer;font-size:16px">×</button>
      </div>
      <div style="padding:18px 20px">
        <div style="padding:10px 12px;background:rgba(239,68,68,.06);border-radius:8px;margin-bottom:14px">
          <div style="font-size:11px;color:var(--t3)">Reddedilecek prim</div>
          <div style="font-size:13px;font-weight:600;color:var(--t)">${window._esc(p.title || '—')} — ${_fmt(p.amount)}</div>
        </div>
        <div class="fr">
          <div class="fl">RED NEDENİ <span style="color:var(--rdt)">*</span></div>
          <textarea class="fi" id="pirim-reject-reason" rows="3" style="resize:none" placeholder="Neden reddediyorsunuz? (personel görecek)"></textarea>
        </div>
        <div style="font-size:11px;color:var(--t3);margin-top:6px">💡 Personel bu açıklamayı görecek ve prim kaydını düzenleyerek tekrar gönderebilecek.</div>
      </div>
      <div style="padding:12px 20px;border-top:1px solid var(--b);display:flex;justify-content:space-between;background:var(--s2)">
        <button class="btn" onclick="document.getElementById('mo-pirim-reject').remove()">İptal</button>
        <button class="btn btnp" style="background:#EF4444;border-color:#EF4444" onclick="_confirmRejectPirim(${id})">❌ Reddet</button>
      </div>
    </div>`;
  document.body.appendChild(mo);
  setTimeout(() => { mo.classList.add('open'); document.getElementById('pirim-reject-reason')?.focus(); }, 10);
}

function _confirmRejectPirim(id) {
  const reason = (document.getElementById('pirim-reject-reason')?.value || '').trim();
  if (!reason) { window.toast?.('Red nedeni zorunludur', 'err'); return; }
  const d = window.loadPirim?.() || [];
  const p = d.find(x => x.id === id); if (!p) return;
  p.status       = 'rejected';
  p.rejectedBy   = window.CU()?.id;
  p.rejectedAt   = _now();
  p.rejectReason = reason;
  window.storePirim?.(d);
  document.getElementById('mo-pirim-reject')?.remove();
  renderPirim();
  window.toast?.('Prim reddedildi', 'ok');
  _pirimDuyur('❌ Prim Reddedildi', '"' + (p.title||'') + '" reddedildi. Neden: ' + reason, 'err');
  window.logActivity?.('view', `Prim reddedildi: "${p.title}" — ${reason}`);
}
window._confirmRejectPirim = _confirmRejectPirim;


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
  if (!window._yetkiKontrol?.('sil')) return;
  if (!window.isAdmin()) { window.toast?.('Yetki yok', 'err'); return; }
  window.confirmModal('Bu prim kaydını silmek istediğinizden emin misiniz?', {
    title: 'Prim Sil',
    danger: true,
    confirmText: 'Evet, Sil',
    onConfirm: () => {
      var raw = JSON.parse(localStorage.getItem('ak_pirim1') || '[]');
      var x = raw.find(function(p) { return p.id === id; });
      if (x) { x.isDeleted = true; x.deletedAt = new Date().toISOString(); }
      window.storePirim?.(raw);
      renderPirim();
      window.toast?.('Silindi', 'ok');
    }
  });
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 6 — DETAY MODAL
// ════════════════════════════════════════════════════════════════

/* PIRIM-PERSONEL-DETAY-001: Personel bazlı prim geçmişi — uid → tüm primler + toplam */
window._pirimDetayGoster = function(uid) {
  var primler = typeof loadPirim==='function' ? loadPirim() : [];
  var kisinin = primler.filter(function(p){
    return !p.isDeleted && (p.uid===uid || p.personelId===uid);
  });
  if (!kisinin.length) { window.toast?.('Prim kaydı yok','warn'); return; }
  var toplam = kisinin.reduce(function(s,p){ return s+parseFloat(p.amount||p.tutar||0); },0);
  var odenen = kisinin.filter(function(p){ return p.status==='paid'||p.odendi; })
                      .reduce(function(s,p){ return s+parseFloat(p.amount||p.tutar||0); },0);
  var html = '<div style="padding:16px;max-width:480px">'
    + '<div style="font-size:13px;font-weight:600;color:var(--t);margin-bottom:12px">Prim Ge\u00e7mi\u015fi</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0;font-size:9px;font-weight:600;color:var(--t3);padding:5px 8px;background:var(--s2);border-radius:4px 4px 0 0;text-transform:uppercase">'
    + '<div>D\u00f6nem</div><div>Tutar</div><div>Durum</div></div>'
    + kisinin.slice(0,20).map(function(p){
      var odendi = p.status==='paid'||p.odendi;
      return '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0;padding:6px 8px;border-bottom:0.5px solid var(--b);font-size:11px">'
        + '<div style="color:var(--t3)">' + (p.donem||p.period||(p.ts||'').slice(0,7)||'\u2014') + '</div>'
        + '<div>' + parseFloat(p.amount||p.tutar||0).toLocaleString('tr-TR') + '</div>'
        + '<div style="color:' + (odendi?'#16A34A':'#D97706') + ';font-weight:500">' + (odendi?'\u00d6dendi':'Bekliyor') + '</div>'
        + '</div>';
    }).join('')
    /* PIRIM-DETAY-EXCEL-001: Excel export butonu (footer öncesi) */
    + '<div style="text-align:right;margin-top:8px">'
    + '<button onclick="window._pirimDetayExcel?.(\'' + String(uid) + '\')" style="font-size:10px;padding:4px 12px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit">\u2b07 Excel</button>'
    + '</div>'
    + '<div style="padding:8px;text-align:right;font-size:11px;font-weight:600">'
    + 'Toplam: ' + toplam.toLocaleString('tr-TR') + ' | \u00d6denen: ' + odenen.toLocaleString('tr-TR')
    + '</div></div>';
  window.confirmModal?.(html, {title:'', confirmText:'Kapat', cancelText:null, onConfirm:function(){}});
};

function showPirimDetail(id) {
  _ensurePirimModals();
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
      ${_dRow('Personel', window._esc(u.name||''))}
      ${_dRow('İşlem Türü', `${td?.emoji||''} ${td?.label||p.type}`)}
      ${_dRow('Açıklama', window._esc(p.title||'—'))}
      ${p.code ? _dRow('İşlem Kodu', window._esc(p.code)) : ''}
      ${_dRow('Baz Tutar', _fmt(p.baseAmount))}
      ${_dRow('Oran', `%${((p.rate||0)*100).toFixed(0)}`)}
      ${_dRow('Net Prim', `<span style="font-weight:800;color:var(--ac)">${_fmt(p.amount)}</span>`)}
      ${_dRow('İşlem Tarihi', p.date||'—')}
      ${_dRow('Ödeme Tarihi', `<span style="color:${over?'var(--rd)':'var(--t)'}">${payD}${over?' ⚠️':''}</span>`)}
      ${_dRow('Durum', `<span class="badge ${st2.c}">${st2.emoji} ${st2.l}</span>`)}
      ${p.note ? _dRow('Not', window._esc(p.note)) : ''}
      ${p.createdAt ? _dRow('Oluşturulma', p.createdAt) : ''}
      ${p.approvedAt ? _dRow('Onaylanma', p.approvedAt) : ''}
      ${p.paidAt ? _dRow('Ödeme T.', p.paidAt) : ''}
      ${p.rejectReason ? _dRow('Red Nedeni', `<span style="color:var(--rd)">${window._esc(p.rejectReason)}</span>`) : ''}
    </div>
    ${p.bonusCeza ? `<div style="margin-top:12px;padding:12px;background:var(--s2);border-radius:8px">
      <div style="font-size:11px;font-weight:700;color:var(--t);margin-bottom:8px">Bonus / Ceza Dökümü</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${p.bonusCeza.gecikmeGun > 0 ? '<span style="font-size:10px;padding:3px 8px;border-radius:5px;background:#FCEBEB;color:#791F1F">⚠️ Gecikme: ' + p.bonusCeza.gecikmeGun + ' gün (-%' + (p.bonusCeza.gecikmeGun >= 3 ? '20' : '10') + ')</span>' : ''}
        ${p.bonusCeza.yeniUrun ? '<span style="font-size:10px;padding:3px 8px;border-radius:5px;background:#EAF3DE;color:#15803D">🆕 Yeni Ürün Bonusu</span>' : ''}
        ${p.bonusCeza.caprazSatis ? '<span style="font-size:10px;padding:3px 8px;border-radius:5px;background:#EAF3DE;color:#15803D">🔄 Çapraz Satış Bonusu</span>' : ''}
        ${p.bonusCeza.yoneticiIndirimOran > 0 ? '<span style="font-size:10px;padding:3px 8px;border-radius:5px;background:#FAEEDA;color:#92400E">📉 Yönetici İndirimi: %' + (p.bonusCeza.yoneticiIndirimOran * 100).toFixed(0) + '</span>' : ''}
        ${!p.bonusCeza.gecikmeGun && !p.bonusCeza.yeniUrun && !p.bonusCeza.caprazSatis && !p.bonusCeza.yoneticiIndirimOran ? '<span style="font-size:10px;color:var(--t3)">Bonus/ceza uygulanmadı</span>' : ''}
      </div>
    </div>` : ''}`;
  // Reddedilmişse ve kendi primseyse tekrar gönder butonu
  const footer = window.g('pirim-detail-footer');
  if (footer) {
    const cu2 = window.CU?.();
    if (!window.isAdmin?.() && p.uid === cu2?.id && p.status === 'rejected') {
      footer.innerHTML = `<button class="btn btnp" onclick="Pirim.resubmit(${id});window.closeMo?.('mo-pirim-detail')">↩ Düzenle & Tekrar Gönder</button>`;
    } else {
      footer.innerHTML = '';
    }
  }
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
  // Modal dinamik oluştur — index.html'e bağımlılık yok
  let mo = document.getElementById('mo-pirim-pdf');
  if (!mo) {
    mo = document.createElement('div');
    mo.className = 'mo'; mo.id = 'mo-pirim-pdf'; mo.style.zIndex = '2300';
    mo.innerHTML = `
      <div class="moc" style="max-width:700px;padding:0;border-radius:14px;overflow:hidden">
        <div style="background:#1e1b4b;padding:14px 20px;color:#fff;display:flex;align-items:center;justify-content:space-between">
          <div style="font-size:14px;font-weight:600">📄 Prim Yönetmeliği</div>
          <button onclick="window.closeMo?.('mo-pirim-pdf')" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:7px;padding:3px 10px;cursor:pointer;font-size:16px">×</button>
        </div>
        <div id="pirim-pdf-area" style="padding:0">
          <div id="pirim-pdf-viewer" style="min-height:400px"></div>
        </div>
        <div id="pirim-pdf-footer" style="padding:12px 20px;border-top:1px solid var(--b);display:flex;align-items:flex-start;gap:8px;flex-wrap:wrap;background:var(--s2)"></div>
      </div>`;
    document.body.appendChild(mo);
  }

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

  // Ek dokümanlar listesi
  const extraDocs = _loadPirimDocs();
  const docsHtml = extraDocs.length ? `
    <div style="padding:10px 20px;border-top:1px solid var(--b)">
      <div style="font-size:10px;font-weight:600;color:var(--t3);text-transform:uppercase;margin-bottom:6px">EK DOKÜMANLAR (${extraDocs.length})</div>
      ${extraDocs.map(d => `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--b)">
        <span style="font-size:14px">${d.name.endsWith('.pdf')?'📄':d.name.match(/\.(png|jpg|jpeg)$/i)?'🖼':'📎'}</span>
        <a href="${d.data}" download="${window._esc(d.name)}" style="flex:1;font-size:12px;color:var(--ac);text-decoration:none">${window._esc(d.name)}</a>
        <span style="font-size:10px;color:var(--t3)">${d.uploadedAt?.slice(0,10)||''}</span>
        ${window.isAdmin?.() ? `<button onclick="deletePirimDoc(${d.id})" style="background:none;border:none;cursor:pointer;font-size:12px;color:var(--t3)">🗑</button>` : ''}
      </div>`).join('')}
      ${window.isAdmin?.() ? `<button class="btn btns" onclick="uploadPirimDoc()" style="font-size:11px;margin-top:6px">+ Doküman Ekle</button>` : ''}
    </div>` : (window.isAdmin?.() ? `
    <div style="padding:10px 20px;border-top:1px solid var(--b)">
      <button class="btn btns" onclick="uploadPirimDoc()" style="font-size:11px">+ Ek Doküman Yükle (PDF/görsel)</button>
    </div>` : '');

  if (!stored) {
    viewer.innerHTML = `
      <div style="text-align:center;padding:40px;color:var(--t2)">
        <div style="font-size:40px;margin-bottom:12px">📄</div>
        <div style="font-weight:600;margin-bottom:6px">Yönetmelik henüz yüklenmedi</div>
        <div style="font-size:13px">${window.isAdmin()
          ? '📎 "PDF Yükle" butonunu kullanın. <br><small style="color:var(--t3)">Maks. 3 MB · Yalnızca .pdf</small>'
          : 'Yöneticinizden yönetmeliği sisteme yüklemesini isteyin.'}</div>
      </div>` + docsHtml;
  } else {
    viewer.innerHTML = `
      <iframe src="${stored}" style="width:100%;height:520px;border:none;border-radius:8px" title="Prim Yönetmeliği"></iframe>` + docsHtml;
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
  window.confirmModal('Yönetmelik PDF\'i kaldırmak istediğinizden emin misiniz?', {
    title: 'PDF Kaldır',
    danger: true,
    confirmText: 'Evet, Kaldır',
    onConfirm: () => {
      try { localStorage.removeItem(PDF_KEY); } catch(e) { console.warn('[pirim] hata:', e); }
      window.toast?.('PDF kaldırıldı', 'ok');
      showPirimPdf();
    }
  });
}

function _loadPdf() {
  try { return localStorage.getItem(PDF_KEY); } catch(e) { return null; }
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 8 — PARAMETRELER (Admin: Tip Oranları + Tier Tabloları)
// ════════════════════════════════════════════════════════════════
let _PT = {}; // temp params editing object

function openPirimParams() {
  _ensurePirimModals();
  if (!window.isAdmin()) { window.toast?.('Sadece yönetici erişebilir', 'err'); return; }

  // Mevcut parametreleri yükle (derin kopyala)
  const saved  = window.loadPirimParams?.() || {};
  _PT = {
    typeRates:   JSON.parse(JSON.stringify(saved.typeRates   || {})),
    tiersNA:     JSON.parse(JSON.stringify(saved.tiersNA     || TIER_YENI_AVCI)),
    tiersSC:     JSON.parse(JSON.stringify(saved.tiersSC     || TIER_SADIK_CIFTCI)),
    multipliers: JSON.parse(JSON.stringify(saved.multipliers || {
      yeniTedarikci: 0.15, capraz: 0.25, yeniUrun: 0.25,
      fiyatAvantaji: 0.30, tamamlayiciIhmal: 0.30, revizyon: 0.07,
    })),
  };

  _renderParamsTypeRates();
  _renderParamsTiers('NA');
  _renderParamsTiers('SC');
  _renderParamsMult();
  window.openMo?.('mo-pirim-params');
}

function _renderParamsTypeRates() {
  const cont = window.g('pirim-params-type-list');
  if (!cont) return;

  // Sadece serbest (non-alim) tipler için oran ayarlanabilir
  // Alım tipleri (NA/SC/YT) tier tablosundan otomatik gelir
  const freeTypes = Object.entries(PIRIM_TYPES).filter(([,v]) => v.base !== 'alim');

  cont.innerHTML = `
    <div style="background:var(--s2);border-radius:8px;padding:10px 12px;margin-bottom:8px;font-size:11px;color:var(--t2)">
      🐣 <strong>NA / 🌱 SC / 🔄 YT</strong> tipleri kademe tablosundan otomatik hesaplanır. Aşağıda yalnızca <strong>serbest tipler</strong> düzenlenir.
    </div>
    ${freeTypes.map(([k, v]) => {
      const cur = _PT.typeRates[k];
      return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;padding:8px 12px;background:var(--sf);border:1px solid var(--b);border-radius:8px">
        <span style="font-size:18px;width:24px;text-align:center">${v.emoji}</span>
        <span style="flex:1;font-size:12px;font-weight:600;color:var(--t)">${v.label}</span>
        <div style="display:flex;align-items:center;gap:6px">
          <label style="font-size:11px;color:var(--t2)">Oran (%)</label>
          <input type="number" value="${cur?.rate != null ? (cur.rate * 100).toFixed(2) : ''}"
            placeholder="—"
            style="width:80px;padding:5px 8px;font-size:12px;border:1px solid var(--b);border-radius:6px;background:var(--sf);color:var(--t)"
            oninput="_PT.typeRates['${k}'] = this.value ? { rate: parseFloat(this.value)/100 } : null">
        </div>
        <span style="font-size:10px;color:var(--t3)">Boş=serbest</span>
      </div>`;
    }).join('')}`;
}

function _renderParamsTiers(which) {
  const contId = which === 'NA' ? 'pirim-params-tier-na' : 'pirim-params-tier-sc';
  const cont = window.g(contId);
  if (!cont) return;
  const tiers = which === 'NA' ? _PT.tiersNA : _PT.tiersSC;
  const arr   = which === 'NA' ? '_PT.tiersNA' : '_PT.tiersSC';

  cont.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:6px;margin-bottom:6px;padding:0 4px">
      <span style="font-size:10px;color:var(--t2);font-weight:600">Alt Sınır (₺)</span>
      <span style="font-size:10px;color:var(--t2);font-weight:600">Üst Sınır (₺)</span>
      <span style="font-size:10px;color:var(--t2);font-weight:600">Oran (%)</span>
      <span></span>
    </div>
    ${tiers.map((t, i) => `
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:6px;margin-bottom:6px;align-items:center">
        <input type="number" value="${t.min}" placeholder="0"
          style="padding:5px 8px;font-size:12px;border:1px solid var(--b);border-radius:6px;background:var(--sf);color:var(--t)"
          oninput="${arr}[${i}].min=parseFloat(this.value)||0">
        <input type="number" value="${t.max === Infinity ? '' : t.max}" placeholder="∞"
          style="padding:5px 8px;font-size:12px;border:1px solid var(--b);border-radius:6px;background:var(--sf);color:var(--t)"
          oninput="${arr}[${i}].max=this.value?parseFloat(this.value):Infinity">
        <input type="number" value="${(t.rate * 100).toFixed(3)}" step="0.001" placeholder="0.000"
          style="padding:5px 8px;font-size:12px;border:1px solid var(--b);border-radius:6px;background:var(--sf);color:var(--t)"
          oninput="${arr}[${i}].rate=parseFloat(this.value)/100||0">
        <button onclick="${arr}.splice(${i},1);Pirim._renderTiers('${which}')"
          style="padding:4px 8px;background:var(--rdb,#fee2e2);border:none;border-radius:6px;cursor:pointer;color:var(--rdt,#ef4444);font-size:12px">✕</button>
      </div>`).join('')}`;
}

function addPirimTierRow(which) {
  const last = which === 'NA' ? _PT.tiersNA.at(-1) : _PT.tiersSC.at(-1);
  const newMin = last?.max === Infinity ? (last?.min || 0) + 500000 : (last?.max || 0);
  const arr = { min: newMin, max: Infinity, rate: last?.rate || 0, label: '' };
  if (which === 'NA') _PT.tiersNA.push(arr);
  else                _PT.tiersSC.push(arr);
  _renderParamsTiers(which);
}

function _renderParamsMult() {
  const cont = window.g('pirim-params-multipliers');
  if (!cont) return;
  const m = _PT.multipliers;
  const rows = [
    { key: 'yeniTedarikci',   label: '🔄 Yeni Tedarikçi bonus (%)',    hint: 'Varsayılan: 15' },
    { key: 'capraz',          label: '➕ Çapraz Satış bonus (%)',       hint: 'Varsayılan: 25' },
    { key: 'yeniUrun',        label: '🆕 Yeni Ürün bonus (%)',          hint: 'Varsayılan: 25' },
    { key: 'fiyatAvantaji',   label: '💰 Fiyat Avantajı bonus (%)',     hint: 'Varsayılan: 30' },
    { key: 'tamamlayiciIhmal',label: '❌ Tamamlayıcı İhmal ceza (%)',  hint: 'Varsayılan: 30' },
    { key: 'revizyon',        label: '❌ Revizyon Cezası (%)',          hint: 'Varsayılan: 7'  },
  ];
  cont.innerHTML = rows.map(r => `
    <div style="background:var(--sf);border:1px solid var(--b);border-radius:8px;padding:8px 12px">
      <label style="font-size:11px;color:var(--t2);display:block;margin-bottom:4px">${r.label}</label>
      <input type="number" value="${((m[r.key]||0)*100).toFixed(1)}" step="0.1" placeholder="${r.hint}"
        style="width:100%;padding:5px 8px;font-size:13px;font-weight:600;border:1px solid var(--b);border-radius:6px;background:var(--sf);color:var(--t)"
        oninput="_PT.multipliers['${r.key}']=parseFloat(this.value)/100||0">
      <div style="font-size:10px;color:var(--t3);margin-top:2px">${r.hint}</div>
    </div>`).join('');
}

function savePirimParams() {
  if (!window.isAdmin()) return;
  // Tier label'larını otomatik oluştur
  _PT.tiersNA.forEach((t, i) => { t.label = `Kademe ${i+1}`; });
  _PT.tiersSC.forEach((t, i) => { t.label = `Kademe ${i+1}`; });
  window.storePirimParams?.(_PT);
  window.closeMo?.('mo-pirim-params');
  renderPirim();
  window.toast?.('✅ Prim parametreleri kaydedildi', 'ok');
  window.logActivity?.('view', 'Prim parametreleri güncellendi');
}

// compat alias
function addPirimParam() { addPirimTierRow('NA'); }

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
  <title>Prim Fişi — ${window._esc(u.name||'')}</title>
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
    <tr><td class="lbl">Personel</td><td class="val">${window._esc(u.name||'')}</td></tr>
    <tr><td class="lbl">İşlem Türü</td><td class="val">${td?.emoji||''} ${td?.label||p.type}</td></tr>
    <tr><td class="lbl">Açıklama</td><td class="val">${window._esc(p.title||'—')}</td></tr>
    ${p.code ? `<tr><td class="lbl">İşlem Kodu</td><td class="val">${window._esc(p.code)}</td></tr>` : ''}
    <tr><td class="lbl">Baz Tutar</td><td class="val">${_fmt(p.baseAmount)}</td></tr>
    <tr><td class="lbl">Prim Oranı</td><td class="val">%${((p.rate||0)*100).toFixed(0)}</td></tr>
    <tr><td class="lbl" style="font-weight:bold">NET PRİM</td><td class="amount">${_fmt(p.amount)}</td></tr>
    <tr><td class="lbl">İşlem Tarihi</td><td class="val">${p.date||'—'}</td></tr>
    <tr><td class="lbl">Ödeme Tarihi</td><td class="val">${p.payDate||_calcExpiry(p.date)}</td></tr>
    <tr><td class="lbl">Durum</td><td><span class="badge">${st2.emoji} ${st2.l}</span></td></tr>
    ${p.note ? `<tr><td class="lbl">Not</td><td>${window._esc(p.note)}</td></tr>` : ''}
    ${p.approvedAt ? `<tr><td class="lbl">Onaylanma</td><td class="val">${p.approvedAt}</td></tr>` : ''}
  </table>
  <div class="sign">
    <div>Hazırlayan<br><br>${window._esc(u.name||'')}</div>
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
// PRİM v4 — 15 GELİŞTİRME
// ════════════════════════════════════════════════════════════════

// ─── 1. DUYURU ENTEGRASYONu — Her prim işleminde otomatik duyuru ─
function _pirimDuyur(title, body, type) {
  try {
    const ann = window.loadAnn?.() || [];
    const cu  = window.CU?.() || {};
    ann.unshift({
      id:          generateNumericId(),
      title,
      body,
      type:        type || 'ok',
      audience:    'all',
      ts:          (function(){ const n=new Date(); return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0')+' '+String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0'); })(),
      read:        [],
      addedBy:     cu.id,
      addedByName: cu.name || 'Sistem',
      auto:        true,
    });
    window.storeAnn?.(ann);
    window.updateAnnBadge?.();
  } catch(e) { console.warn('[pirim] duyuru hatası:', e); }
}
window._pirimDuyur = _pirimDuyur;

// ─── 2. STREAK (SERİ) TAKİBİ ─────────────────────────────────────
function calcPirimStreak(userId) {
  const all = (window.loadPirim?.() || [])
    .filter(p => p.uid === userId && ['approved','paid'].includes(p.status))
    .map(p => p.date?.slice(0,7))
    .filter(Boolean);
  if (!all.length) return 0;
  const months = [...new Set(all)].sort().reverse();
  const now = new Date();
  let streak = 0;
  for (let i = 0; i < months.length; i++) {
    const d = new Date(months[i] + '-01');
    const diff = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    if (diff === i) streak++;
    else break;
  }
  return streak;
}
window.calcPirimStreak = calcPirimStreak;

// ─── 3. HEDEF SİSTEMİ — Aylık prim hedefi ───────────────────────
function loadPirimGoals() {
  try { return JSON.parse(localStorage.getItem('duay_pirim_goals') || '{}'); } catch { return {}; }
}
function savePirimGoals(d) { localStorage.setItem('duay_pirim_goals', JSON.stringify(d)); }

function openPirimGoalModal(userId) {
  const goals = loadPirimGoals();
  const users = window.loadUsers?.() || [];
  const u = users.find(x => x.id === userId);
  const goal = goals[userId] || 0;

  const mo = document.createElement('div');
  mo.className = 'mo'; mo.style.zIndex = '2300';
  mo.innerHTML = '<div class="moc" style="max-width:380px">'
    + '<div class="mt">🎯 Aylık Hedef — ' + (u?.name||'Personel') + '</div>'
    + '<div class="fr"><div class="fl">AYLK PRİM HEDEFİ (₺)</div>'
    + '<input class="fi" type="number" id="goal-inp" value="' + goal + '" placeholder="0"></div>'
    + '<div class="mf"><button class="btn" onclick="this.closest(".mo").remove()">İptal</button>'
    + '<button class="btn btnp" onclick="_savePirimGoal(' + userId + ')">Kaydet</button></div>'
    + '</div>';
  document.body.appendChild(mo);
  setTimeout(() => mo.classList.add('open'), 10);
}

function _savePirimGoal(userId) {
  const goals = loadPirimGoals();
  goals[userId] = parseFloat(document.getElementById('goal-inp')?.value || '0') || 0;
  savePirimGoals(goals);
  document.querySelector('.mo.open')?.remove();
  window.toast?.('Hedef kaydedildi ✓', 'ok');
  renderPirim();
}
window.openPirimGoalModal = openPirimGoalModal;
window._savePirimGoal     = _savePirimGoal;

// ─── 4. ROZET SİSTEMİ ───────────────────────────────────────────
const PIRIM_BADGES = [
  { id: 'first',    label: '🏅 İlk Prim',        check: (all) => all.length >= 1 },
  { id: 'five',     label: '⭐ 5 Prim',           check: (all) => all.length >= 5 },
  { id: 'ten',      label: '🌟 10 Prim',          check: (all) => all.length >= 10 },
  { id: 'streak3',  label: '🔥 3 Ay Serisi',      check: (all, uid) => calcPirimStreak(uid) >= 3 },
  { id: 'streak6',  label: '⚡ 6 Ay Serisi',      check: (all, uid) => calcPirimStreak(uid) >= 6 },
  { id: 'big',      label: '💎 5.000₺+ Tek Prim', check: (all) => all.some(p => p.amount >= 5000) },
  { id: 'top',      label: '👑 1. Sıra',           check: (all, uid) => _isTopEarner(uid) },
];

function _isTopEarner(userId) {
  const all  = window.loadPirim?.() || [];
  const totals = {};
  all.filter(p => ['approved','paid'].includes(p.status))
     .forEach(p => { totals[p.uid] = (totals[p.uid]||0) + p.amount; });
  const sorted = Object.entries(totals).sort((a,b) => b[1]-a[1]);
  return sorted[0]?.[0] == userId;
}

function getUserBadges(userId) {
  const all = (window.loadPirim?.() || []).filter(p => p.uid === userId && ['approved','paid'].includes(p.status));
  return PIRIM_BADGES.filter(b => b.check(all, userId));
}
window.getUserBadges = getUserBadges;

// ─── 5. TOPLU ONAY ───────────────────────────────────────────────
function bulkApprovePirim() {
  if (!window._yetkiKontrol?.('toplu_guncelle')) return;
  const checkboxes = document.querySelectorAll('.prm-bulk:checked');
  if (!checkboxes.length) { window.toast?.('Önce kayıt seçin', 'warn'); return; }
  const all = window.loadPirim?.() || [];
  let approved = 0;
  checkboxes.forEach(cb => {
    const id = parseInt(cb.dataset.id);
    const p  = all.find(x => x.id === id);
    if (p && p.status === 'pending') {
      p.status = 'approved';
      p.approvedBy = window.CU?.()?.id;
      p.approvedAt = new Date().toISOString().slice(0,16);
      approved++;
    }
  });
  window.storePirim?.(all);
  _pirimDuyur('✅ ' + approved + ' Prim Toplu Onaylandı', approved + ' adet prim kaydı yönetici tarafından onaylandı.', 'ok');
  window.toast?.(approved + ' prim onaylandı ✓', 'ok');
  window.logActivity?.('user', approved + ' prim toplu onaylandı');
  renderPirim();
}
window.bulkApprovePirim = bulkApprovePirim;

// ─── 6. EXCEL'DEN TOPLU İÇE AKTAR ───────────────────────────────
function importPirimFromXlsx() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.xlsx,.xls,.csv';
  inp.onchange = function() {
    window.toast?.('İçe aktarım hazırlanıyor... (CSV formatı desteklenir)', 'ok');
    const file = this.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const lines = e.target.result.split('\n').slice(1);
      const all = window.loadPirim?.() || [];
      let added = 0;
      lines.forEach(line => {
        const [name, type, title, amount, date] = line.split(',').map(s => s.trim().replace(/"/g,''));
        if (!name || !amount) return;
        const users = window.loadUsers?.() || [];
        const u = users.find(x => x.name.toLowerCase().includes(name.toLowerCase()));
        if (!u) return;
        all.unshift({ id: generateNumericId(), uid: u.id, type: type||'diger', title: title||'', amount: parseFloat(amount)||0, date: date||new Date().toISOString().slice(0,10), status: 'pending', ts: new Date().toISOString() });
        added++;
      });
      window.storePirim?.(all);
      _pirimDuyur('📥 ' + added + ' Prim İçe Aktarıldı', 'Excel dosyasından ' + added + ' prim kaydı sisteme yüklendi.', 'info');
      window.toast?.(added + ' kayıt içe aktarıldı ✓', 'ok');
      renderPirim();
    };
    reader.readAsText(file);
  };
  inp.click();
}
window.importPirimFromXlsx = importPirimFromXlsx;

// ─── 7. HATIRLATICI — Bekleyen primleri yöneticiye bildir ────────
function sendPirimReminder() {
  const pending = (window.loadPirim?.() || []).filter(p => p.status === 'pending');
  if (!pending.length) { window.toast?.('Bekleyen prim yok', 'ok'); return; }
  const msg = pending.length + ' adet prim onay bekliyor:\n' +
    pending.slice(0,5).map(p => '• ' + p.title + ' — ' + _fmt(p.amount)).join('\n');
  navigator.clipboard?.writeText(msg);
  window.addNotif?.('⏳', pending.length + ' prim onay bekliyor', 'warn', 'pirim');
  _pirimDuyur('⏳ ' + pending.length + ' Prim Onay Bekliyor', msg, 'warn');
  window.toast?.('Hatırlatıcı gönderildi, mesaj kopyalandı', 'ok');
}
window.sendPirimReminder = sendPirimReminder;

// ─── 8. KİŞİSEL ÖZET RAPOR ──────────────────────────────────────
function printPirimSlip(userId) {
  const cu    = userId || window.CU?.()?.id;
  const users = window.loadUsers?.() || [];
  const u     = users.find(x => x.id === cu) || {};
  const all   = (window.loadPirim?.() || []).filter(p => p.uid === cu && ['approved','paid'].includes(p.status));
  const total = all.reduce((s,p) => s+(p.amount||0), 0);
  const thisM = new Date().toISOString().slice(0,7);
  const monthAmt = all.filter(p => (p.date||'').startsWith(thisM)).reduce((s,p)=>s+(p.amount||0),0);
  const badges = getUserBadges(cu).map(b => b.label).join(' ');
  const streak = calcPirimStreak(cu);

  const win = window.open('','_blank');
  win.document.write(`<html><head><title>Prim Özet — ${window._esc(u.name||'?')}</title>
  <style>body{font-family:sans-serif;padding:40px;max-width:600px;margin:0 auto}
  h2{color:#1e1b4b}table{width:100%;border-collapse:collapse}td,th{padding:8px;border:1px solid #eee;font-size:13px}
  th{background:#f5f5ff;font-weight:600}.green{color:#10B981}.ac{color:#6366F1}</style></head><body>
  <h2>⭐ Prim Özet Raporu</h2>
  <p style="color:#6b7280">${((window.SIRKET_DATA && window.SIRKET_DATA.unvan_en) || 'Duay Global LLC')} · ${new Date().toLocaleDateString('tr-TR')}</p>
  <table style="margin-bottom:20px">
    <tr><td><b>Personel</b></td><td>${window._esc(u.name||'—')}</td></tr>
    <tr><td><b>Bu Ay</b></td><td class="ac">${monthAmt.toLocaleString('tr-TR')} ₺</td></tr>
    <tr><td><b>Toplam</b></td><td class="ac">${total.toLocaleString('tr-TR')} ₺</td></tr>
    <tr><td><b>Seri</b></td><td>${streak} ay 🔥</td></tr>
    <tr><td><b>Rozetler</b></td><td>${badges||'—'}</td></tr>
  </table>
  <table><thead><tr><th>Tür</th><th>Açıklama</th><th>Tutar</th><th>Tarih</th></tr></thead><tbody>
  ${all.slice(0,20).map(p=>`<tr><td>${PIRIM_TYPES[p.type]?.emoji||''} ${PIRIM_TYPES[p.type]?.label||p.type}</td><td>${window._esc(p.title||'—')}</td><td class="ac">${(p.amount||0).toLocaleString('tr-TR')} ₺</td><td>${p.date||'—'}</td></tr>`).join('')}
  </tbody></table>
  <button onclick="window.print()" style="margin-top:20px;background:#6366F1;color:#fff;border:none;padding:10px 24px;border-radius:8px;cursor:pointer">Yazdır / PDF</button>
  </body></html>`);
}
window.printPirimSlip = printPirimSlip;

// ─── 9. KARŞILAŞTIRMA MOD ───────────────────────────────────────
function openPirimCompare() {
  const users = (window.loadUsers?.() || []).filter(u => u.status === 'active');
  const all   = window.loadPirim?.() || [];
  const thisM = new Date().toISOString().slice(0,7);

  const data = users.map(u => {
    const myAll   = all.filter(p => p.uid === u.id && ['approved','paid'].includes(p.status));
    const monthAmt = myAll.filter(p=>(p.date||'').startsWith(thisM)).reduce((s,p)=>s+(p.amount||0),0);
    const totalAmt = myAll.reduce((s,p)=>s+(p.amount||0),0);
    return { ...u, monthAmt, totalAmt, count: myAll.length };
  }).filter(u => u.totalAmt > 0).sort((a,b) => b.monthAmt - a.monthAmt);

  const maxAmt = Math.max(...data.map(d => d.monthAmt), 1);

  const mo = document.createElement('div');
  mo.className = 'mo'; mo.style.zIndex = '2300';
  let html = '<div class="moc" style="max-width:520px"><div class="mt">📊 Personel Karşılaştırma — ' + thisM + '</div>';
  html += '<div style="display:flex;flex-direction:column;gap:8px">';
  data.forEach((d, i) => {
    const pct = Math.round(d.monthAmt / maxAmt * 100);
    html += '<div style="padding:8px 0">';
    html += '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">';
    html += '<span style="font-weight:500">' + (i===0?'🥇':i===1?'🥈':i===2?'🥉':'  ') + ' ' + d.name + '</span>';
    html += '<span style="color:var(--ac);font-weight:600">' + d.monthAmt.toLocaleString('tr-TR') + ' ₺</span></div>';
    html += '<div style="height:6px;background:var(--s2);border-radius:99px;overflow:hidden">';
    html += '<div style="height:100%;width:' + pct + '%;background:var(--ac);border-radius:99px"></div></div></div>';
  });
  html += '</div><div class="mf"><button class="btn" onclick="this.closest(".mo").remove()">Kapat</button></div></div>';
  mo.innerHTML = html;
  document.body.appendChild(mo);
  setTimeout(() => mo.classList.add('open'), 10);
}
window.openPirimCompare = openPirimCompare;

// ─── 10. OTOMATİK HATIRLATICI TIMER ─────────────────────────────
function startPirimReminderTimer() {
  // Her gün sabah 09:00'da bekleyen primleri kontrol et
  const checkAndRemind = () => {
    const pending = (window.loadPirim?.() || []).filter(p => p.status === 'pending');
    if (pending.length > 0) {
      const key = 'prm_remind_' + new Date().toISOString().slice(0,10);
      if (!localStorage.getItem(key)) {
        window.addNotif?.('⏳', pending.length + ' prim onay bekliyor', 'warn', 'pirim');
        localStorage.setItem(key, '1');
      }
    }
  };
  setTimeout(checkAndRemind, 5000);
  setInterval(checkAndRemind, 3600000); // her saat kontrol
}
window.startPirimReminderTimer = startPirimReminderTimer;
setTimeout(() => startPirimReminderTimer(), 3000);

// ─── 11. PRİM YÜZDESİ HESAPLAYICI ────────────────────────────────
function openPirimCalc() {
  const mo = document.createElement('div');
  mo.className = 'mo'; mo.style.zIndex = '2300';
  mo.innerHTML = '<div class="moc" style="max-width:400px">'
    + '<div class="mt">🧮 Prim Hesaplayıcı</div>'
    + '<div class="fr"><div class="fl">İŞLEM TUTARI (₺)</div><input class="fi" type="number" id="pc-amount" placeholder="0" oninput="_calcPirimPct()"></div>'
    + '<div class="fr"><div class="fl">PRİM ORANI (%)</div><input class="fi" type="number" id="pc-pct" placeholder="5" value="5" oninput="_calcPirimPct()"></div>'
    + '<div id="pc-result" style="padding:12px;background:var(--s2);border-radius:9px;margin-top:8px;font-size:13px;text-align:center;color:var(--ac);font-weight:600"></div>'
    + '<div class="mf"><button class="btn" onclick="this.closest(".mo").remove()">Kapat</button></div>'
    + '</div>';
  document.body.appendChild(mo);
  setTimeout(() => mo.classList.add('open'), 10);
}

function _calcPirimPct() {
  const amt = parseFloat(document.getElementById('pc-amount')?.value||'0');
  const pct = parseFloat(document.getElementById('pc-pct')?.value||'0');
  const result = amt * pct / 100;
  const el = document.getElementById('pc-result');
  if (el) el.textContent = amt && pct ? '≈ ' + result.toLocaleString('tr-TR',{minimumFractionDigits:2}) + ' ₺ prim' : '—';
}
window.openPirimCalc  = openPirimCalc;
window._calcPirimPct  = _calcPirimPct;

// ─── 12. DÖNEM KARŞILAŞTIRMA ─────────────────────────────────────
function openPirimPeriodCompare() {
  const all = window.loadPirim?.() || [];
  const now = new Date();
  const thisM  = now.toISOString().slice(0,7);
  const lastM  = new Date(now.getFullYear(), now.getMonth()-1, 1).toISOString().slice(0,7);
  const thisAmt = all.filter(p=>['approved','paid'].includes(p.status)&&(p.date||'').startsWith(thisM)).reduce((s,p)=>s+p.amount,0);
  const lastAmt = all.filter(p=>['approved','paid'].includes(p.status)&&(p.date||'').startsWith(lastM)).reduce((s,p)=>s+p.amount,0);
  const diff    = thisAmt - lastAmt;
  const pct     = lastAmt > 0 ? Math.round(diff/lastAmt*100) : 100;

  const mo = document.createElement('div');
  mo.className = 'mo'; mo.style.zIndex = '2300';
  mo.innerHTML = '<div class="moc" style="max-width:400px"><div class="mt">📈 Dönem Karşılaştırma</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">'
    + '<div style="background:var(--s2);border-radius:10px;padding:14px;text-align:center"><div style="font-size:10px;color:var(--t3)">Bu Ay</div><div style="font-size:20px;font-weight:700;color:var(--ac)">' + thisAmt.toLocaleString('tr-TR') + ' ₺</div></div>'
    + '<div style="background:var(--s2);border-radius:10px;padding:14px;text-align:center"><div style="font-size:10px;color:var(--t3)">Geçen Ay</div><div style="font-size:20px;font-weight:700;color:var(--t2)">' + lastAmt.toLocaleString('tr-TR') + ' ₺</div></div>'
    + '</div>'
    + '<div style="text-align:center;padding:12px;background:' + (diff>=0?'rgba(16,185,129,.08)':'rgba(239,68,68,.08)') + ';border-radius:9px">'
    + '<div style="font-size:22px;font-weight:700;color:' + (diff>=0?'#10B981':'#EF4444') + '">' + (diff>=0?'+':'') + diff.toLocaleString('tr-TR') + ' ₺</div>'
    + '<div style="font-size:12px;color:var(--t3)">' + (diff>=0?'📈':'📉') + ' Geçen aya göre ' + Math.abs(pct) + '% ' + (diff>=0?'artış':'düşüş') + '</div>'
    + '</div>'
    + '<div class="mf"><button class="btn" onclick="this.closest(".mo").remove()">Kapat</button></div></div>';
  document.body.appendChild(mo);
  setTimeout(() => mo.classList.add('open'), 10);
}
window.openPirimPeriodCompare = openPirimPeriodCompare;

// ─── 13. PRİM ŞABLONLARI ─────────────────────────────────────────
const PIRIM_TEMPLATES = [
  { label: '🛒 Satınalma — Standart',  type: 'satinalma', title: 'Satınalma İşlemi', pct: 3 },
  { label: '📦 Navlun — Gelen',         type: 'navlun',    title: 'Navlun İşlemi',    pct: 2 },
  { label: '🤝 CRM — Yeni Müşteri',    type: 'cari',      title: 'Yeni Müşteri',      pct: 5 },
  { label: '💡 Öneri Sistemi',          type: 'ozel',      title: 'Geliştirme Önerisi', pct: 0 },
];

function applyPirimTemplate(idx) {
  const t = PIRIM_TEMPLATES[idx]; if (!t) return;
  const typeEl  = document.getElementById('prm-f-type');
  const titleEl = document.getElementById('prm-f-title');
  const pctEl   = document.getElementById('prm-f-pct');
  if (typeEl)  typeEl.value  = t.type;
  if (titleEl) titleEl.value = t.title;
  if (pctEl)   pctEl.value   = t.pct;
  window.selectPirimType?.(t.type);
  window.calcPirimAuto?.();
  window.toast?.('Şablon uygulandı: ' + t.label, 'ok');
}
window.applyPirimTemplate = applyPirimTemplate;

// ─── 14. AYLIK OTOMATİK ÖZET DUYURUSU ────────────────────────────
function sendMonthlyPirimSummary() {
  const all  = window.loadPirim?.() || [];
  const now  = new Date();
  const thisM = now.toISOString().slice(0,7);
  const paid = all.filter(p => p.status === 'paid' && (p.paidAt||p.date||'').startsWith(thisM));
  if (!paid.length) return;
  const total = paid.reduce((s,p) => s+(p.amount||0), 0);
  const users = window.loadUsers?.() || [];
  const counts = {};
  paid.forEach(p => { counts[p.uid] = (counts[p.uid]||0)+1; });
  const topUid = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0];
  const topUser = users.find(u => u.id == topUid);

  const key = 'prm_monthly_summary_' + thisM;
  if (localStorage.getItem(key)) return;
  localStorage.setItem(key, '1');

  _pirimDuyur(
    '📊 ' + now.toLocaleString('tr-TR',{month:'long'}) + ' Prim Özeti',
    now.toLocaleString('tr-TR',{month:'long'}) + ' ayında ' + paid.length + ' prim ödemesi yapıldı. Toplam: ' + total.toLocaleString('tr-TR') + ' ₺' + (topUser ? ' · En çok: ' + topUser.name : ''),
    'ok'
  );
}
window.sendMonthlyPirimSummary = sendMonthlyPirimSummary;
setTimeout(() => sendMonthlyPirimSummary(), 8000);

// ─── 15. ONAY GECİKME ALARMI ─────────────────────────────────────
function checkPirimApprovalDelay() {
  const all = window.loadPirim?.() || [];
  const now = new Date();
  all.filter(p => p.status === 'pending').forEach(p => {
    const created = new Date(p.ts || p.date);
    const daysDiff = Math.ceil((now - created) / 86400000);
    if (daysDiff >= 3) {
      const key = 'prm_delay_' + p.id + '_' + now.toISOString().slice(0,10);
      if (!localStorage.getItem(key)) {
        window.addNotif?.('⚠', '"' + p.title + '" ' + daysDiff + ' gündür onay bekliyor', 'warn', 'pirim');
        localStorage.setItem(key, '1');
      }
    }
  });
}
setTimeout(() => checkPirimApprovalDelay(), 6000);
window.checkPirimApprovalDelay = checkPirimApprovalDelay;


// Reddedilen primi düzenleyip tekrar onaya gönder
function resubmitPirim(id) {
  const d = window.loadPirim?.() || [];
  const p = d.find(x => x.id === id); if (!p) return;
  const cu = window.CU?.();
  if (p.uid !== cu?.id) { window.toast?.('Bu size ait değil', 'err'); return; }
  if (p.status !== 'rejected') { window.toast?.('Sadece reddedilen primler tekrar gönderilebilir', 'err'); return; }

  // Düzenleme modalını aç
  Pirim.openModal(id);

  // Modal açıldıktan sonra kırmızı banner ekle
  setTimeout(() => {
    const banner = document.createElement('div');
    banner.style.cssText = 'background:rgba(239,68,68,.08);border-left:3px solid #EF4444;padding:8px 12px;border-radius:0 8px 8px 0;margin-bottom:8px;font-size:11px;color:#EF4444';
    banner.innerHTML = '⚠️ <b>Red nedeni:</b> ' + (p.rejectReason || '—') + '<br><span style="color:var(--t3)">Değişiklik yapın ve kaydedin — tekrar onaya gönderilecek.</span>';
    const firstField = document.querySelector('#mo-pirim .mob, #mo-pirim .moc > div:nth-child(2)');
    if (firstField) firstField.insertBefore(banner, firstField.firstChild);
  }, 200);
}
window.resubmitPirim = resubmitPirim;


// ════════════════════════════════════════════════════════════════
// 5 TASARIM ÖNERİSİ — Görsel referanslar
// Şu an aktif: Bento + inline grid tablo (B)
//
// A) Stripe Dashboard — Sol sidebar KPI + sağda tablo
//    Üstte: büyük ₺ rakamı, progress bar, küçük istatistikler
//    Orta: işlem tablosu (yoğun, çok veri)
//    Sağ: liderlik + trendler
//
// B) [AKTİF] Bento Grid — Apple Settings tarzı
//    Üstte: 5 metrik kutu yan yana (tıklanabilir)
//    Gradient kişisel banner (streak, hedef bar dahil)
//    Grid tablo + sağ panel
//
// C) Kanban Board — Trello / Linear tarzı
//    4 sütun: Bekliyor | Peer Review | Onaylı | Ödendi
//    Her prim sürükle-bırak ile sütun değiştirir
//    Üstte toplam tutar her sütunda ayrı
//
// D) Timeline — Notion tarzı
//    Sol: takvim görünümü (ay bazlı)
//    Sağ: seçilen aya ait prim listesi
//    Renk kodlu işlem türleri
//    Her işlem satırında mini progress
//
// E) Leaderboard Odaklı — Oyun / Gamification tarzı
//    Üstte büyük podium (1. 2. 3. kişi profil fotoğrafıyla)
//    Altında tam sıralama tablosu (rank badge'leriyle)
//    Sağda kişisel kart: XP bar, rozet vitrin, hedef
//    Renk: altın/gümüş/bronz vurgular
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
// 6 GELİŞTİRME ÖNERİSİ (ek)
// ════════════════════════════════════════════════════════════════

// GELİŞTİRME 1: Prim Tahmini — Bu ay ne kadar kazanacağını göster
function showPirimForecast(userId) {
  const all  = (window.loadPirim?.() || []).filter(p => p.uid === (userId||window.CU?.()?.id));
  const now  = new Date();
  const thisM = now.toISOString().slice(0,7);
  // Son 3 ayın ortalaması
  const months = [0,1,2].map(i => {
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    return d.toISOString().slice(0,7);
  });
  const avgs = months.map(m =>
    all.filter(p => ['approved','paid'].includes(p.status) && (p.date||'').startsWith(m))
       .reduce((s,p) => s+(p.amount||0), 0)
  );
  const avg3 = avgs.reduce((s,v) => s+v, 0) / 3;
  const thisMonthSoFar = all.filter(p => (p.date||'').startsWith(thisM)).reduce((s,p)=>s+(p.amount||0),0);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  const daysPassed  = now.getDate();
  const dailyRate   = thisMonthSoFar / daysPassed;
  const forecast    = Math.round(dailyRate * daysInMonth);

  const mo = document.createElement('div');
  mo.className = 'mo'; mo.style.zIndex = '2300';
  mo.innerHTML = '<div class="moc" style="max-width:380px">'
    + '<div class="mt">🔮 Bu Ay Tahmini</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">'
    + '<div style="background:var(--s2);border-radius:9px;padding:12px;text-align:center"><div style="font-size:10px;color:var(--t3)">Günlük ort.</div><div style="font-size:16px;font-weight:600;color:var(--ac)">' + _fmt(dailyRate) + '</div></div>'
    + '<div style="background:var(--s2);border-radius:9px;padding:12px;text-align:center"><div style="font-size:10px;color:var(--t3)">Ay sonu tahmini</div><div style="font-size:16px;font-weight:600;color:#10B981">' + _fmt(forecast) + '</div></div>'
    + '<div style="background:var(--s2);border-radius:9px;padding:12px;text-align:center"><div style="font-size:10px;color:var(--t3)">3 aylık ort.</div><div style="font-size:16px;font-weight:600;color:var(--t2)">' + _fmt(avg3) + '</div></div>'
    + '<div style="background:var(--s2);border-radius:9px;padding:12px;text-align:center"><div style="font-size:10px;color:var(--t3)">Şu ana kadar</div><div style="font-size:16px;font-weight:600;color:var(--t)">' + _fmt(thisMonthSoFar) + '</div></div>'
    + '</div>'
    + '<div class="mf"><button class="btn" onclick="this.closest(".mo").remove()">Kapat</button></div></div>';
  document.body.appendChild(mo);
  setTimeout(() => mo.classList.add('open'), 10);
}
window.showPirimForecast = showPirimForecast;

// GELİŞTİRME 2: Prim Takvimi — Ay görünümü (renderOdmCalendar benzeri)
function renderPirimCalendar(cont) {
  if (!cont) { cont = document.getElementById('pirim-list'); }
  if (!cont) return;
  const all  = window.loadPirim?.() || [];
  const now  = new Date();
  const y    = now.getFullYear();
  const m    = now.getMonth();
  const dim  = new Date(y, m+1, 0).getDate();
  const start = (new Date(y, m, 1).getDay() + 6) % 7; // Pzt=0

  const dayMap = {};
  all.forEach(p => {
    if (!(p.date||'').startsWith(y+'-'+String(m+1).padStart(2,'0'))) return;
    const d = parseInt((p.date||'').slice(8));
    if (!dayMap[d]) dayMap[d] = [];
    dayMap[d].push(p);
  });

  const days = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
  let html = '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;padding:12px">';
  days.forEach(d => { html += '<div style="text-align:center;font-size:9px;font-weight:600;color:var(--t3);padding:4px 0">' + d + '</div>'; });
  for (let i=0;i<start;i++) html += '<div></div>';
  for (let d=1;d<=dim;d++) {
    const isToday = d === now.getDate();
    const items   = dayMap[d] || [];
    const total   = items.reduce((s,p)=>s+(p.amount||0),0);
    html += '<div style="min-height:52px;border:0.5px solid var(--b);border-radius:6px;padding:3px;background:' + (isToday?'rgba(99,102,241,.06)':'var(--sf)') + '">';
    html += '<div style="font-size:10px;font-weight:' + (isToday?'700':'400') + ';color:' + (isToday?'var(--ac)':'var(--t2)') + ';text-align:center">' + d + '</div>';
    if (items.length) {
      html += '<div style="font-size:8px;padding:1px 3px;background:rgba(99,102,241,.1);color:var(--ac);border-radius:3px;margin-top:1px">' + items.length + ' prim</div>';
      html += '<div style="font-size:8px;color:var(--ac);font-weight:600">' + Math.round(total/1000) + 'k₺</div>';
    }
    html += '</div>';
  }
  html += '</div>';
  cont.innerHTML = html;
}
window.renderPirimCalendar = renderPirimCalendar;

// GELİŞTİRME 3: Ekip Performans Özeti — Admin için
function showTeamPerformance() {
  const all   = window.loadPirim?.() || [];
  const users = (window.loadUsers?.() || []).filter(u => u.status === 'active');
  const thisM = new Date().toISOString().slice(0,7);

  const rows = users.map(u => {
    const mine   = all.filter(p => p.uid === u.id);
    const monthA = mine.filter(p => ['approved','paid'].includes(p.status) && (p.date||'').startsWith(thisM));
    return {
      name:     u.name,
      month:    monthA.reduce((s,p)=>s+(p.amount||0),0),
      pending:  mine.filter(p=>p.status==='pending').length,
      streak:   calcPirimStreak ? calcPirimStreak(u.id) : 0,
      badges:   getUserBadges ? getUserBadges(u.id).length : 0,
    };
  }).filter(r => r.month > 0 || r.pending > 0).sort((a,b) => b.month-a.month);

  const mo = document.createElement('div');
  mo.className = 'mo'; mo.style.zIndex = '2300';
  let html = '<div class="moc" style="max-width:560px"><div class="mt">👥 Ekip Performansı — ' + thisM + '</div>';
  html += '<div style="display:flex;flex-direction:column;gap:6px">';
  rows.forEach((r,i) => {
    html += '<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--s2);border-radius:8px">';
    html += '<span style="font-size:14px;min-width:24px;text-align:center">' + (i===0?'🥇':i===1?'🥈':i===2?'🥉':'  ') + '</span>';
    html += '<div style="flex:1"><div style="font-size:12px;font-weight:500">' + r.name + '</div>';
    html += '<div style="font-size:10px;color:var(--t3)">' + r.streak + ' ay seri 🔥 · ' + r.badges + ' rozet</div></div>';
    html += '<div style="text-align:right"><div style="font-size:13px;font-weight:600;color:var(--ac)">' + _fmt(r.month) + '</div>';
    html += '<div style="font-size:10px;color:var(--amt)">' + (r.pending?r.pending+' bekliyor':'') + '</div></div></div>';
  });
  html += '</div><div class="mf"><button class="btn" onclick="this.closest(".mo").remove()">Kapat</button></div></div>';
  mo.innerHTML = html;
  document.body.appendChild(mo);
  setTimeout(() => mo.classList.add('open'), 10);
}
window.showTeamPerformance = showTeamPerformance;

// GELİŞTİRME 4: Prim Politikası — Inline açıklamalar
function openPirimPolicy() {
  const mo = document.createElement('div');
  mo.className = 'mo'; mo.style.zIndex = '2300';
  mo.innerHTML = '<div class="moc" style="max-width:500px"><div class="mt">📋 Prim Politikası</div>'
    + '<div style="display:flex;flex-direction:column;gap:10px;font-size:12px;color:var(--t2)">'
    + '<div style="padding:10px;background:var(--s2);border-radius:8px"><b>⏳ Onay Süreci:</b> Prim girilir → Yönetici onayı beklenir → İsteğe bağlı peer review → Kesin onay → Ödeme planı</div>'
    + '<div style="padding:10px;background:var(--s2);border-radius:8px"><b>💰 Oran Belirleme:</b> Prim oranları yalnızca yönetici tarafından belirlenir. Personel oran giremez.</div>'
    + '<div style="padding:10px;background:var(--s2);border-radius:8px"><b>❌ Red Durumu:</b> Reddedilen primler düzenlenip tekrar gönderilebilir. Red nedeni personele bildirilir.</div>'
    + '<div style="padding:10px;background:var(--s2);border-radius:8px"><b>📅 Ödeme Tarihi:</b> Onaylanan primler otomatik olarak ödeme planına eklenir.</div>'
    + '<div style="padding:10px;background:var(--s2);border-radius:8px"><b>🔥 Seri Bonus:</b> Üst üste prim kazanan personele ek katsayı uygulanır.</div>'
    + '</div>'
    + '<div class="mf"><button class="btn" onclick="this.closest(\'.mo\').remove()">Kapat</button>'
    + '<button class="btn btns" onclick="Pirim.showPdf()">📄 Tam Yönetmelik</button></div></div>';
  document.body.appendChild(mo);
  setTimeout(() => mo.classList.add('open'), 10);
}
window.openPirimPolicy = openPirimPolicy;

// GELİŞTİRME 5: Toplu Ödendi İşaretle
function bulkMarkPirimPaid() {
  if (!window.isAdmin()) return;
  const approved = (window.loadPirim?.() || []).filter(p => p.status === 'approved');
  if (!approved.length) { window.toast?.('Ödendi işaretlenecek onaylı prim yok', 'warn'); return; }
  window.confirmModal(approved.length + ' onaylı primi ödendi olarak işaretlemek istiyor musunuz?', {
    title: 'Toplu Ödeme',
    danger: false,
    confirmText: 'Evet, İşaretle',
    onConfirm: () => {
      const all = window.loadPirim?.() || [];
      approved.forEach(p => { p.status = 'paid'; p.paidAt = _now(); p.paidBy = window.CU?.()?.id; });
      window.storePirim?.(all);
      _pirimDuyur('Toplu Prim Ödemesi', approved.length + ' prim ödendi olarak işaretlendi.', 'ok');
      window.toast?.(approved.length + ' prim ödendi işaretlendi', 'ok');
      renderPirim();
    }
  });
}
window.bulkMarkPirimPaid = bulkMarkPirimPaid;

// GELİŞTİRME 6: Araçlar menüsü — tam çalışan versiyon
const _PIRIM_TOOLS = [
  { label: '📊 Ekip Performansı',     fn: 'showTeamPerformance',    desc: 'Tüm personelin aylık prim karşılaştırması' },
  { label: '🔮 Ay Sonu Tahmini',      fn: 'showPirimForecast',      desc: 'Günlük ortalamaya göre ay sonu tahmini' },
  { label: '📈 Dönem Karşılaştır',    fn: 'openPirimPeriodCompare', desc: 'Bu ay vs geçen ay karşılaştırması' },
  { label: '👥 Personel Karşılaştır', fn: 'openPirimCompare',       desc: 'Personeller arası prim sıralaması' },
  { label: '🧮 Prim Hesaplayıcı',     fn: 'openPirimCalc',          desc: 'Tutar ve oran girerek prim hesapla' },
  { label: '📋 Prim Politikası',      fn: 'openPirimPolicy',        desc: 'Prim kuralları ve onay akışı özeti' },
  { label: '💸 Toplu Ödendi',         fn: 'bulkMarkPirimPaid',      desc: 'Tüm onaylıları ödendi işaretle' },
  { label: '📥 Excel den İçe Aktar',  fn: 'importPirimFromXlsx',    desc: 'CSV ile toplu prim girişi' },
];

function _injectPirimExtraTools() {
  if (document.getElementById('pirim-tools-btn')) return;

  const topbar = document.querySelector('#panel-pirim [style*="sticky"]')
               || document.querySelector('#panel-pirim .ph')
               || document.getElementById('panel-pirim')?.firstElementChild;
  if (!topbar) return;

  const wrap = document.createElement('div');
  wrap.id = 'pirim-tools-wrap';
  wrap.style.cssText = 'position:relative;display:inline-block';

  const btn = document.createElement('button');
  btn.id = 'pirim-tools-btn';
  btn.className = 'btn btns';
  btn.style.fontSize = '11px';
  btn.textContent = '🛠 Araçlar ▾';
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    const m = document.getElementById('pirim-tools-menu');
    if (m) m.style.display = m.style.display === 'block' ? 'none' : 'block';
  });

  const menu = document.createElement('div');
  menu.id = 'pirim-tools-menu';
  menu.style.cssText = 'display:none;position:absolute;right:0;top:calc(100% + 6px);background:var(--sf);border:1px solid var(--b);border-radius:12px;min-width:240px;box-shadow:0 8px 32px rgba(0,0,0,.15);z-index:9999;overflow:hidden';

  const hdr = document.createElement('div');
  hdr.style.cssText = 'padding:8px 14px;border-bottom:1px solid var(--b);font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em';
  hdr.textContent = 'Araçlar';
  menu.appendChild(hdr);

  _PIRIM_TOOLS.forEach(function(tool) {
    const item = document.createElement('button');
    item.className = 'btn btns';
    item.style.cssText = 'width:100%;text-align:left;border:none;border-radius:0;padding:9px 14px;font-size:12px;display:flex;flex-direction:column;gap:1px';
    item.innerHTML = '<span style="font-weight:500">' + tool.label + '</span>'
      + '<span style="font-size:10px;color:var(--t3)">' + tool.desc + '</span>';
    item.addEventListener('click', function() {
      menu.style.display = 'none';
      var fn = window[tool.fn];
      if (typeof fn === 'function') {
        fn();
      } else {
        window.toast?.('Yükleniyor, tekrar deneyin', 'warn');
        console.warn('[Pirim Araçlar] Bulunamadı:', tool.fn, '— typeof:', typeof window[tool.fn]);
      }
    });
    menu.appendChild(item);
  });

  wrap.appendChild(btn);
  wrap.appendChild(menu);

  var btnGroup = topbar.querySelector('div[style*="gap"]') || topbar.querySelector('.ur') || topbar;
  if (btnGroup.firstChild) btnGroup.insertBefore(wrap, btnGroup.firstChild);
  else btnGroup.appendChild(wrap);
}

document.addEventListener('click', function(e) {
  var m = document.getElementById('pirim-tools-menu');
  var w = document.getElementById('pirim-tools-wrap');
  if (m && w && !w.contains(e.target)) m.style.display = 'none';
});



// Araçlar enjeksiyonu — renderPirim her çalışınca kontrol et
(function() {
  var _base = renderPirim;
  renderPirim = function() { _base(); setTimeout(_injectPirimExtraTools, 200); };
  window.renderPirim = renderPirim;
  if (window.Pirim) window.Pirim.render = renderPirim;
})();

// ════════════════════════════════════════════════════════════════
// PRİM SİMÜLATÖRÜ
// ════════════════════════════════════════════════════════════════

function openPirimSimulator() {
  const old = document.getElementById('mo-pirim-sim');
  if (old) old.remove();
  const mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-pirim-sim'; mo.style.zIndex = '2100';
  mo.innerHTML = `<div class="moc" style="max-width:480px;padding:0;border-radius:12px;overflow:hidden">
    <div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">
      <span style="font-size:15px;font-weight:700;color:var(--t)">🧮 Prim Simülatörü</span>
      <button onclick="document.getElementById('mo-pirim-sim').remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button>
    </div>
    <div style="padding:16px 20px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
        <div class="fg"><div class="fl">ALIM TUTARI (TL)</div>
          <input type="number" class="fi" id="sim-amount" placeholder="500000" min="0" oninput="_simCalc()" style="font-size:15px;font-weight:600">
        </div>
        <div class="fg"><div class="fl">PRİM TİPİ</div>
          <select class="fi" id="sim-type" onchange="_simCalc()">
            <option value="NA">🐣 Yeni Avcı (İlk Alım)</option>
            <option value="SC">🌱 Sadık Çiftçi (Tekrar)</option>
            <option value="YT">🔄 Yeni Tedarikçi</option>
          </select>
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px">
        <label style="font-size:11px;display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" id="sim-capraz" onchange="_simCalc()" style="accent-color:var(--ac)">Çapraz Satış +%25</label>
        <label style="font-size:11px;display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" id="sim-yeni-ted" onchange="_simCalc()" style="accent-color:var(--ac)">Yeni Tedarikçi +%15</label>
        <label style="font-size:11px;display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" id="sim-yeni-urun" onchange="_simCalc()" style="accent-color:var(--ac)">Yeni Ürün +%25</label>
      </div>
      <div id="sim-result" style="background:var(--s2);border-radius:10px;padding:16px;min-height:60px">
        <div style="font-size:12px;color:var(--t3)">Tutar girin — prim anında hesaplanacak</div>
      </div>
      <div style="margin-top:14px">
        <div style="font-size:10px;font-weight:600;color:var(--t3);text-transform:uppercase;margin-bottom:6px">Kademe Tablosu</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px" id="sim-tier-table"></div>
      </div>
    </div>
  </div>`;
  document.body.appendChild(mo);
  mo.addEventListener('click', e => { if (e.target === mo) mo.remove(); });
  setTimeout(() => { mo.classList.add('open'); _simRenderTiers(); }, 10);
}

function _simCalc() {
  const amount = parseFloat(document.getElementById('sim-amount')?.value || '0');
  const type   = document.getElementById('sim-type')?.value || 'NA';
  const res    = document.getElementById('sim-result');
  if (!res || !amount) { if (res) res.innerHTML = '<div style="font-size:12px;color:var(--t3)">Tutar girin</div>'; return; }
  const opts = {
    caprazSatis:    document.getElementById('sim-capraz')?.checked,
    yeniTedarikci:  document.getElementById('sim-yeni-ted')?.checked,
    yeniUrun:       document.getElementById('sim-yeni-urun')?.checked,
  };
  const r = calcSatinalimaPrim(amount, type, opts);
  res.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <span style="font-size:12px;color:var(--t2)">Kademe: <b>${r.tier}</b></span>
      <span style="font-size:12px;color:var(--t2)">Oran: <b>%${(r.appliedRate * 100).toFixed(2)}</b></span>
    </div>
    <div style="font-size:28px;font-weight:800;color:var(--ac)">${_fmtTL(r.gross)}</div>
    <div style="font-size:11px;color:var(--t3);margin-top:4px">${_fmtTL(amount)} alım × %${(r.appliedRate * 100).toFixed(2)}</div>
    ${r.breakdown.length ? '<div style="margin-top:8px;border-top:1px solid var(--b);padding-top:8px">' + r.breakdown.map(b =>
      `<div style="font-size:11px;color:${b.positive ? 'var(--grt)' : 'var(--rdt)'};margin-bottom:2px">${b.positive ? '▲' : '▼'} ${b.label}</div>`
    ).join('') + '</div>' : ''}`;
  _simRenderTiers();
}

function _simRenderTiers() {
  const type = document.getElementById('sim-type')?.value || 'NA';
  const cont = document.getElementById('sim-tier-table');
  if (!cont) return;
  const tiers = type === 'SC' ? TIER_SADIK_CIFTCI : TIER_YENI_AVCI;
  const amount = parseFloat(document.getElementById('sim-amount')?.value || '0');
  cont.innerHTML = `
    <div style="border:1px solid var(--b);border-radius:8px;overflow:hidden">
      <div style="padding:6px 10px;background:var(--s2);font-size:10px;font-weight:700;color:var(--t3)">🐣 Yeni Avcı</div>
      ${TIER_YENI_AVCI.map(t => `<div style="padding:4px 10px;font-size:11px;border-top:1px solid var(--b);display:flex;justify-content:space-between;${type==='NA'&&amount>=t.min&&amount<t.max?'background:var(--al);font-weight:600':''}"><span>${t.label}</span><span>%${(t.rate*100).toFixed(2)}</span></div>`).join('')}
    </div>
    <div style="border:1px solid var(--b);border-radius:8px;overflow:hidden">
      <div style="padding:6px 10px;background:var(--s2);font-size:10px;font-weight:700;color:var(--t3)">🌱 Sadık Çiftçi</div>
      ${TIER_SADIK_CIFTCI.map(t => `<div style="padding:4px 10px;font-size:11px;border-top:1px solid var(--b);display:flex;justify-content:space-between;${type==='SC'&&amount>=t.min&&amount<t.max?'background:var(--al);font-weight:600':''}"><span>${t.label}</span><span>%${(t.rate*100).toFixed(2)}</span></div>`).join('')}
    </div>`;
}
window._simCalc = _simCalc;
window._simRenderTiers = _simRenderTiers;

// ════════════════════════════════════════════════════════════════
// TABİR SÖZLÜĞÜ
// ════════════════════════════════════════════════════════════════

function openPirimGlossary() {
  const old = document.getElementById('mo-pirim-glossary');
  if (old) old.remove();
  const GLOSSARY = [
    { term:'Yeni Avcı',     emoji:'🐣', desc:'İlk kez yapılan tedarik/alım. En yüksek prim oranı uygulanır.', rate:'%0.30 → %1.00', example:'500K ilk alım = 500.000 × %0.70 = 3.500 ₺' },
    { term:'Sadık Çiftçi',  emoji:'🌱', desc:'Mevcut tedarikçi/üründen tekrar alım. Daha düşük oran.', rate:'%0.10 → %0.30', example:'500K tekrar alım = 500.000 × %0.25 = 1.250 ₺' },
    { term:'Yeni Tedarikçi', emoji:'🔄', desc:'Tekrar alımda yeni ve daha iyi tedarikçi bulundu.', rate:'Yeni Avcı oranı + %15 bonus', example:'250K + yeni tedarikçi = 250.000 × %0.575 = 1.437 ₺' },
    { term:'Çapraz Satış',  emoji:'➕', desc:'Tamamlayıcı ürün önerildi ve satışa dönüştü.', rate:'+%25 ekstra bonus', example:'Temel prim 2.000 ₺ + %25 = 2.500 ₺' },
    { term:'Dedektif Bonusu',emoji:'🕵️', desc:'Tedarikçinin gizli zam, hile veya kalite tuzağı tespit edildi.', rate:'Serbest (yönetici belirler)', example:'Tespit edilen zarar: 50.000 ₺ → Bonus: 5.000 ₺' },
    { term:'R&D Bonusu',    emoji:'🔬', desc:'Ürün geliştirme çalışması ile satış artışı sağlandı.', rate:'Serbest (proje bazlı)', example:'Yeni ambalaj → %15 satış artışı → 3.000 ₺ bonus' },
    { term:'Erken Kalkan',  emoji:'🌅', desc:'Sipariş teslim süresini kısaltan proaktif çalışma.', rate:'Hız bonusu (opsiyonel)', example:'3 gün erken teslim → 1.000 ₺ bonus' },
    { term:'Yönetici Müdahalesi', emoji:'⚠️', desc:'Müzakereye yönetici müdahale etti — ceza uygulanır.', rate:'Yönetici indirimi × 3 (ceza)', example:'%5 yönetici indirimi → prim × %15 ceza' },
  ];
  const mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-pirim-glossary'; mo.style.zIndex = '2100';
  mo.innerHTML = `<div class="moc" style="max-width:560px;padding:0;border-radius:12px;overflow:hidden">
    <div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">
      <span style="font-size:15px;font-weight:700;color:var(--t)">📖 Prim Tabir Sözlüğü</span>
      <button onclick="document.getElementById('mo-pirim-glossary').remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button>
    </div>
    <div style="padding:8px 20px;max-height:70vh;overflow-y:auto">
      ${GLOSSARY.map(g => `<div style="border-bottom:1px solid var(--b);padding:12px 0">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="font-size:20px">${g.emoji}</span>
          <span style="font-size:14px;font-weight:700;color:var(--t)">${window._esc(g.term)}</span>
          <span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:5px;background:var(--al);color:var(--ac)">${g.rate}</span>
        </div>
        <div style="font-size:12px;color:var(--t2);line-height:1.5;margin-bottom:4px">${window._esc(g.desc)}</div>
        <div style="font-size:11px;color:var(--t3);background:var(--s2);padding:6px 10px;border-radius:6px;font-family:'DM Mono',monospace">Örnek: ${window._esc(g.example)}</div>
      </div>`).join('')}
    </div>
  </div>`;
  document.body.appendChild(mo);
  mo.addEventListener('click', e => { if (e.target === mo) mo.remove(); });
  setTimeout(() => mo.classList.add('open'), 10);
}

// ════════════════════════════════════════════════════════════════
// YÖNETMELİK DOKÜMAN YÜKLEMESİ GELİŞTİRME
// ════════════════════════════════════════════════════════════════

const PIRIM_DOC_KEY = 'ak_pirim_docs';

function _loadPirimDocs() {
  try { return JSON.parse(localStorage.getItem(PIRIM_DOC_KEY) || '[]'); } catch { return []; }
}
function _storePirimDocs(d) {
  try { localStorage.setItem(PIRIM_DOC_KEY, JSON.stringify(d)); } catch(e) { console.warn('[pirim] hata:', e); }
}

function uploadPirimDoc() {
  if (!window.isAdmin?.()) { window.toast?.('Doküman yükleme admin yetkisi gerektirir', 'err'); return; }
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.pdf,.png,.jpg,.jpeg,.doc,.docx';
  inp.onchange = () => {
    const file = inp.files[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { window.toast?.('Dosya 5MB\'den büyük olamaz', 'err'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const docs = _loadPirimDocs();
      docs.unshift({ id: generateNumericId(), name: file.name, data: ev.target.result, uploadedBy: window.CU?.()?.id, uploadedAt: window.nowTs?.() || new Date().toISOString() });
      _storePirimDocs(docs);
      window.toast?.(file.name + ' yüklendi ✓', 'ok');
      showPirimPdf(); // modalı yenile
    };
    reader.readAsDataURL(file);
  };
  inp.click();
}
function deletePirimDoc(id) {
  if (!window.isAdmin?.()) return;
  window.confirmModal('Bu dokümanı silmek istediğinizden emin misiniz?', {
    title: 'Doküman Sil', danger: true, confirmText: 'Evet, Sil',
    onConfirm: () => {
      _storePirimDocs(_loadPirimDocs().filter(d => d.id !== id));
      window.toast?.('Silindi', 'ok');
      showPirimPdf();
    }
  });
}
window.uploadPirimDoc = uploadPirimDoc;
window.deletePirimDoc = deletePirimDoc;

// ════════════════════════════════════════════════════════════════
// CEZA HESAPLAYICI
// ════════════════════════════════════════════════════════════════

function openPenaltyCalc() {
  const old = document.getElementById('mo-pirim-penalty');
  if (old) old.remove();
  const mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-pirim-penalty'; mo.style.zIndex = '2100';
  mo.innerHTML = `<div class="moc" style="max-width:440px;padding:0;border-radius:12px;overflow:hidden">
    <div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">
      <span style="font-size:15px;font-weight:700;color:var(--t)">⚠️ Ceza Hesaplayıcı</span>
      <button onclick="document.getElementById('mo-pirim-penalty').remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button>
    </div>
    <div style="padding:16px 20px">
      <div class="fg"><div class="fl">BRÜT PRİM TUTARI (TL)</div>
        <input type="number" class="fi" id="pen-gross" placeholder="3500" min="0" oninput="_penCalc()" style="font-size:15px;font-weight:600">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
        <div class="fg"><div class="fl">YÖNETİCİ İNDİRİMİ (%)</div>
          <input type="number" class="fi" id="pen-mgr" placeholder="5" min="0" max="100" step="0.1" oninput="_penCalc()">
          <div style="font-size:10px;color:var(--rdt);margin-top:2px">×3 ceza çarpanı uygulanır</div>
        </div>
        <div class="fg"><div class="fl">GECİKME (GÜN)</div>
          <input type="number" class="fi" id="pen-delay" placeholder="0" min="0" oninput="_penCalc()">
          <div style="font-size:10px;color:var(--t3);margin-top:2px">1-2 gün: -%10 · 3+ gün: -%20</div>
        </div>
      </div>
      <div id="pen-result" style="background:var(--s2);border-radius:10px;padding:16px;min-height:60px">
        <div style="font-size:12px;color:var(--t3)">Değer girin — ceza anında hesaplanacak</div>
      </div>
    </div>
  </div>`;
  document.body.appendChild(mo);
  mo.addEventListener('click', e => { if (e.target === mo) mo.remove(); });
  setTimeout(() => mo.classList.add('open'), 10);
}

function _penCalc() {
  const gross = parseFloat(document.getElementById('pen-gross')?.value || '0');
  const mgrPct = parseFloat(document.getElementById('pen-mgr')?.value || '0');
  const delay  = parseInt(document.getElementById('pen-delay')?.value || '0');
  const res    = document.getElementById('pen-result');
  if (!res || !gross) { if (res) res.innerHTML = '<div style="font-size:12px;color:var(--t3)">Değer girin</div>'; return; }

  let net = gross;
  const lines = [];

  if (mgrPct > 0) {
    const penRate = Math.min((mgrPct / 100) * 3, 1);
    const penTL   = Math.round(gross * penRate * 100) / 100;
    lines.push({ label: `Yönetici Müdahalesi: %${mgrPct} × 3 = -%${(penRate*100).toFixed(0)}`, amount: -penTL });
    net -= penTL;
  }
  if (delay > 0) {
    const dRate = delay >= 3 ? 0.20 : 0.10;
    const dTL   = Math.round(net * dRate * 100) / 100;
    lines.push({ label: `Gecikme (${delay} gün): -%${(dRate*100).toFixed(0)}`, amount: -dTL });
    net -= dTL;
  }

  const lost = gross - Math.max(0, net);
  res.innerHTML = `
    <div style="display:flex;justify-content:space-between;margin-bottom:8px">
      <span style="font-size:12px;color:var(--t2)">Brüt Prim</span>
      <span style="font-size:12px;font-weight:600">${_fmtTL(gross)}</span>
    </div>
    ${lines.map(l => `<div style="display:flex;justify-content:space-between;margin-bottom:4px">
      <span style="font-size:11px;color:var(--rdt)">${l.label}</span>
      <span style="font-size:11px;font-weight:600;color:var(--rdt)">${_fmtTL(l.amount)}</span>
    </div>`).join('')}
    <div style="border-top:2px solid var(--b);margin-top:8px;padding-top:8px;display:flex;justify-content:space-between">
      <span style="font-size:14px;font-weight:700;color:var(--t)">Net Prim</span>
      <span style="font-size:20px;font-weight:800;color:${net > 0 ? 'var(--ac)' : 'var(--rdt)'}">${_fmtTL(Math.max(0, net))}</span>
    </div>
    <div style="font-size:11px;color:var(--rdt);margin-top:4px;text-align:right">Toplam kesinti: ${_fmtTL(lost)}</div>`;
}
window._penCalc = _penCalc;

// ════════════════════════════════════════════════════════════════
// PRİM TAKVİMİ (Çeyrek Sonu Tarihleri)
// ════════════════════════════════════════════════════════════════

function openPirimCalendar() {
  const old = document.getElementById('mo-pirim-cal');
  if (old) old.remove();
  const year = new Date().getFullYear();
  const quarters = [
    { q: 'Q1', date: year + '-03-31', label: '31 Mart ' + year },
    { q: 'Q2', date: year + '-06-30', label: '30 Haziran ' + year },
    { q: 'Q3', date: year + '-09-30', label: '30 Eylül ' + year },
    { q: 'Q4', date: year + '-12-31', label: '31 Aralık ' + year },
  ];
  const today = new Date();

  const mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-pirim-cal'; mo.style.zIndex = '2100';
  mo.innerHTML = `<div class="moc" style="max-width:420px;padding:0;border-radius:12px;overflow:hidden">
    <div style="padding:14px 20px;border-bottom:1px solid var(--b)">
      <div style="font-size:15px;font-weight:700;color:var(--t)">📅 Prim Ödeme Takvimi — ${year}</div>
    </div>
    <div style="padding:16px 20px">
      ${quarters.map(q => {
        const qDate = new Date(q.date);
        const diff  = Math.ceil((qDate - today) / 86400000);
        const past  = diff < 0;
        const warn  = !past && diff <= 7;
        const caution = !past && !warn && diff <= 14;
        const color = past ? 'var(--t3)' : warn ? '#EF4444' : caution ? '#F59E0B' : '#10B981';
        const bg    = past ? 'var(--s2)' : warn ? 'rgba(239,68,68,.08)' : caution ? 'rgba(245,158,11,.08)' : 'rgba(16,185,129,.08)';
        const badge = past ? 'Geçti' : warn ? `${diff} gün kaldı!` : caution ? `${diff} gün kaldı` : `${diff} gün`;
        return `<div style="display:flex;align-items:center;gap:12px;padding:12px;border-radius:10px;background:${bg};margin-bottom:8px;border:1px solid ${color}20">
          <div style="width:44px;height:44px;border-radius:10px;background:${color}18;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;color:${color}">${q.q}</div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:600;color:var(--t)">${q.label}</div>
            <div style="font-size:11px;color:${color};font-weight:600;margin-top:2px">${badge}</div>
          </div>
          <div style="font-size:18px">${past ? '✅' : warn ? '🔴' : caution ? '🟡' : '🟢'}</div>
        </div>`;
      }).join('')}
    </div>
    <div style="padding:10px 20px;border-top:1px solid var(--b);background:var(--s2);text-align:right">
      <button class="btn" onclick="document.getElementById('mo-pirim-cal').remove()">Kapat</button>
    </div>
  </div>`;
  document.body.appendChild(mo);
  mo.addEventListener('click', e => { if (e.target === mo) mo.remove(); });
  setTimeout(() => mo.classList.add('open'), 10);
}

// ════════════════════════════════════════════════════════════════
// HAK KAYIP SAYACI — onaylı primlerin son kullanma kontrolü
// ════════════════════════════════════════════════════════════════

const PIRIM_EXPIRY_DAYS = 30; // Onaydan itibaren 30 gün hak süresi

/**
 * Onaylı bir primin kalan gününü hesaplar.
 * @param {Object} p — prim kaydı
 * @returns {{ daysLeft:number, color:string, expired:boolean }}
 */
function _calcPirimExpiry(p) {
  if (p.status !== 'approved') return { daysLeft: -1, color: '', expired: false };
  const approvedDate = p.approvedAt || p.updatedAt || p.createdAt || '';
  if (!approvedDate) return { daysLeft: -1, color: '', expired: false };
  const approvedMs = new Date(approvedDate.replace(' ', 'T')).getTime();
  if (isNaN(approvedMs)) return { daysLeft: -1, color: '', expired: false };
  const expiryMs = approvedMs + PIRIM_EXPIRY_DAYS * 86400000;
  const daysLeft = Math.ceil((expiryMs - Date.now()) / 86400000);
  const expired  = daysLeft <= 0;
  const color    = expired ? '#EF4444' : daysLeft <= 3 ? '#EF4444' : daysLeft <= 7 ? '#F59E0B' : '#10B981';
  return { daysLeft, color, expired };
}

/**
 * Süresi dolan primleri otomatik iptal eder ve bildirim gönderir.
 * renderPirim() her çağrıldığında çalışır.
 */
function checkPirimExpiry() {
  var d = window.loadPirim?.() || [];
  var changed = false;
  d.forEach(function(p) {
    if (p.status !== 'approved') return;
    var result = _calcPirimExpiry(p);
    if (result.expired) {
      var exKey = 'pirim_expired_' + p.id;
      if (localStorage.getItem(exKey)) return; // zaten işlendi
      localStorage.setItem(exKey, '1');
      p.status = 'expired';
      p.expiredAt = _now();
      changed = true;
      window.addNotif?.('⏰', '"' + window._esc(p.title) + '" hak süresi doldu — iptal edildi', 'err', 'pirim');
    }
  });
  if (changed) window.storePirim?.(d);
}

// ════════════════════════════════════════════════════════════════
// KANIT ZORUNLULUĞU — savePirim'e dosya kontrolü
// ════════════════════════════════════════════════════════════════

/**
 * Prim talebi kaydedilmeden önce kanıt dosyası kontrolü yapar.
 * Mevcut savePirim'i wrap eder — kanıt yoksa engeller.
 */
(function _patchSavePirimEvidence() {
  const _origSave = savePirim;
  savePirim = function() {
    const eid = parseInt(window.g('prm-eid')?.value || '0');
    // Düzenlemede kanıt kontrolü atla (zaten eklenmiş olabilir)
    if (!eid) {
      const fileEl = window.g('prm-evidence-file');
      const hasFile = fileEl?.files?.length > 0;
      const existing = window.g('prm-evidence-preview')?.dataset?.hasEvidence === '1';
      if (!hasFile && !existing) {
        window.toast?.('Kanıt dosyası/ekran görüntüsü zorunludur — lütfen yükleyin', 'err');
        return;
      }
    }
    // Dosya varsa oku ve entry'ye ekle
    const fileEl = window.g('prm-evidence-file');
    if (fileEl?.files?.[0]) {
      const reader = new FileReader();
      reader.onload = ev => {
        window._pirimEvidenceData = { name: fileEl.files[0].name, data: ev.target.result };
        _origSave();
      };
      reader.readAsDataURL(fileEl.files[0]);
    } else {
      _origSave();
    }
  };
  window.savePirim = savePirim;
  if (window.Pirim) window.Pirim.save = savePirim;
})();

// savePirim sonrası kanıt verisini entry'ye ekle
(function _patchStorePirimEvidence() {
  const _origStore = window.storePirim;
  if (!_origStore) return;
  window.storePirim = function(d) {
    if (window._pirimEvidenceData && d?.length) {
      const last = d[d.length - 1] || d[0];
      if (last && !last.evidence) last.evidence = window._pirimEvidenceData;
      window._pirimEvidenceData = null;
    }
    return _origStore(d);
  };
})();

// ════════════════════════════════════════════════════════════════
// DIŞA AKTARIM
// ════════════════════════════════════════════════════════════════
const Pirim = {
  render:           renderPirim,
  openModal:        openPirimModal,
  save:             savePirim,
  approve:          approvePirim,
  reject:           rejectPirim,
  openPeer:         openPirimPeer,
  sendToPeer:       sendToPeer,
  peerApprove:      peerApprovePirim,
  peerReject:       peerRejectPirim,
  markPaid:         markPirimPaid,
  del:              delPirim,
  selectType:       selectPirimType,
  calcAuto:         calcPirimAuto,
  showDetail:       showPirimDetail,
  showPdf:          showPirimPdf,
  _uploadPdf:       _uploadPdf,
  _deletePdf:       _deletePdf,
  exportXlsx:       exportPirimXlsx,
  openParams:       openPirimParams,
  addParam:         addPirimParam,
  addTierRow:       addPirimTierRow,
  saveParams:       savePirimParams,
  _renderTiers:     _renderParamsTiers,
  renderLeaderboard: renderLeaderboard,
  printSlip:        printPirimSlip,
  resubmit:         resubmitPirim,
  clearFilters:     clearPirimFilters,
  bulkApprove:      bulkApprovePirim,
  importXlsx:       importPirimFromXlsx,
  openGoal:         openPirimGoalModal,
  compare:          openPirimCompare,
  periodCompare:    openPirimPeriodCompare,
  calc:             openPirimCalc,
  reminder:         sendPirimReminder,
  openSimulator:    openPirimSimulator,
  openGlossary:     openPirimGlossary,
  uploadDoc:        uploadPirimDoc,
  deleteDoc:        deletePirimDoc,
  openPenaltyCalc:  openPenaltyCalc,
  openCalendar:     openPirimCalendar,
  checkExpiry:      checkPirimExpiry,
  calcExpiry:       _calcPirimExpiry,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Pirim;
} else {
  window.Pirim = Pirim;
  // Geriye uyumluluk
  window.renderPirim         = renderPirim;
  window.openPirimModal      = openPirimModal;
  window.savePirim           = savePirim;
  window.approvePirim        = approvePirim;
  window.rejectPirim         = rejectPirim;
  window.openPirimPeer       = openPirimPeer;
  window.sendToPeer          = sendToPeer;
  window.peerApprovePirim    = peerApprovePirim;
  window.peerRejectPirim     = peerRejectPirim;
  window.markPirimPaid       = markPirimPaid;
  window.delPirim            = delPirim;
  window.selectPirimType     = selectPirimType;
  window.calcPirimAuto       = calcPirimAuto;
  window.exportPirimXlsx     = exportPirimXlsx;
  window.openPirimParams     = openPirimParams;
  window.addPirimParam       = addPirimParam;
  window.addPirimTierRow     = addPirimTierRow;
  window.savePirimParams     = savePirimParams;
  window._renderParamsTiers  = _renderParamsTiers;
  window.printPirimSlip      = printPirimSlip;
  window.resubmitPirim       = resubmitPirim;
}

/* PIRIM-DETAY-EXCEL-001: Personel prim geçmişi Excel export */
window._pirimDetayExcel = function(uid) {
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX yüklenemedi','err'); return; }
  var primler = typeof loadPirim==='function' ? loadPirim() : [];
  var kisinin = primler.filter(function(p){ return !p.isDeleted && (p.uid===uid||p.personelId===uid); });
  if (!kisinin.length) { window.toast?.('Veri yok','warn'); return; }
  var rows = [['Dönem','Tutar','Para','Durum','Açıklama']];
  kisinin.forEach(function(p){
    rows.push([
      p.donem||p.period||(p.ts||'').slice(0,7)||'—',
      parseFloat(p.amount||p.tutar||0),
      p.currency||p.para||'TRY',
      p.status==='paid'||p.odendi ? 'Ödendi' : 'Bekliyor',
      p.aciklama||p.description||''
    ]);
  });
  var wb=XLSX.utils.book_new();
  var ws=XLSX.utils.aoa_to_sheet(rows);
  ws['!cols']=[{wch:12},{wch:12},{wch:8},{wch:12},{wch:30}];
  XLSX.utils.book_append_sheet(wb,ws,'Prim Detay');
  XLSX.writeFile(wb,'prim-'+String(uid).slice(0,8)+'-'+new Date().toISOString().slice(0,10)+'.xlsx');
  window.toast?.('Excel indirildi ✓','ok');
};
