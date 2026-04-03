# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Duay Global Trade — Operasyon Platformu. A single-page, vanilla JavaScript enterprise platform for operations management (purchasing, supply chain, HR, CRM, finance). No build tools or bundler — all JS is loaded via `<script>` tags in `index.html`. Deployed as a static site to GitHub Pages.

**Language**: Turkish (code comments, UI labels, variable names are predominantly in Turkish).

## Architecture

### No Build System
This is a vanilla HTML/CSS/JS app. There is no npm, no bundler, no transpilation. To develop, open `index.html` in a browser or serve it with any static file server.

### Script Loading Order (Critical)
All scripts are loaded via `<script>` tags at the bottom of `index.html` in a strict dependency order:

1. **Firebase SDK** (CDN) — firebase-app-compat, firebase-auth-compat, firebase-firestore-compat
2. **`config/firebase.js`** — Firebase config, `FS_PATHS` (Firestore collection paths), tenant setup
3. **Core layer** (in order): `translations.js` → `database.js` → `cache.js` → `utils.js` → `auth.js`
4. **Modules** (`src/modules/*.js`) — each module is an IIFE that registers functions on `window`
5. **`src/core/app.js`** — main app engine (must load after all modules)
6. **`src/modules/app_patch.js`** — monkey-patches `App.nav()` to add routing for newer panels (loads right after app.js)
7. **Hub modules** (`lojistik.js`, `ik_hub.js`, `crm_hub.js`) — load last

Adding a new script requires placing it in the correct position in `index.html`.

### Global Communication Pattern
Modules communicate exclusively through `window.*` globals. Each module is an IIFE that:
- Reads dependencies from `window` (e.g., `window.loadUsers`, `window.toast`, `window.Auth`)
- Exports its public API onto `window` (e.g., `window.renderAdmin`, `window.Stok`)

Key globals: `window.App`, `window.Auth`, `window.DB`, `window.CU()`, `window.isAdmin()`, `window.g(id)` (getElementById shortcut), `window.st(id, value)` (set textContent).

### Data Layer
- **Firebase Firestore** for persistent storage (multi-tenant via `FS_PATHS`)
- **localStorage** as local cache with prefixed keys (`ak_*` constants in `database.js` `KEYS` object)
- **`src/core/cache.js`** provides in-memory caching wrappers over `load*`/`save*` functions
- All data access goes through `database.js` functions exposed on `window.DB` and `window.*`

### RBAC / Authorization
Role-based access control with roles: `admin`, `manager`, `lead`, `staff`. Module-level permissions defined in `ALL_MODULES` (app.js) and `ROLE_DEFAULTS`. The `app_patch.js` file handles authorization integration.

### i18n
Bilingual support (TR/EN) via `src/i18n/translations.js`. Usage: `t('key')` for Turkish, `t('key', 'en')` for English. DOM elements use `data-i18n` attributes, updated by `I18n.apply()`.

## Deployment

Pushes to `main` trigger `.github/workflows/deploy.yml` which:
1. Injects Firebase secrets into `index.html` via `sed` (replacing `YOUR_*` placeholders with GitHub Secrets)
2. Deploys to GitHub Pages

Firebase credentials are never committed — `window.__ENV__` placeholders in `index.html` are replaced at deploy time.

## Conventions

- Service Worker (`sw.js`) uses Cache-First for statics, Network-First for API calls
- All conventions are governed by the Birlesik Mimari Anayasa below.

---

## Birlesik Mimari Anayasa v4.0

### BOLUM 1 — EVRENSEL KURALLAR (v3.0)

**K01 — Dosya Mimarisi:** Tek Sorumluluk Ilkesi. Core ≤400 / Modul ≤800 / Hub ≤1200 satir. kebab-case dosya, camelCase degisken, UPPER_SNAKE_CASE sabit.

**K02 — Guvenlik:** Sifir hardcode secret. RBAC: super_admin→admin→manager→lead→staff. Brute-force: 5 hatali giris→15dk kilit. XSS: sanitize() zorunlu. CSP aktif.

**K03 — Veri Butunlugu:** Sabit bagimlilik surumleri (latest yasak). CDN SRI hash zorunlu. Kritik config Object.freeze ile dondurulur.

**K04 — Hata Yonetimi:** Merkezi hata yakalama zorunlu. Sessiz hata yutma yasak. Tum async islemler try-catch icinde. Offline-first mimari. Graceful degradation.

**K05 — Aktivite Loglama:** Her kayit: { timestamp, userId, action, severity, details, ipAddress }. Zorunlu olaylar: login/logout, veri CRUD, rol degisikligi, admin islemleri. Min. 90 gun saklama.

**K06 — Soft Delete:** Fiziksel silme (delete/remove/splice) yasak. Schema: { isDeleted, deletedAt, deletedBy, deletedReason }. 30 gun cop kutusu. 30 saniyelik undo penceresi. Native confirm/alert yasak, custom modal zorunlu.

**K07 — Performans:** Tum listeyi silip yeniden olusturma yasak. 1000+ oge → virtual scrolling. Debounce 150-300ms. API rate limit: 100 istek/dk/kullanici. setInterval/setTimeout temizlenmeli. Lighthouse ≥80, FCP ≤2.5s.

**K08 — Kod Kalitesi:** 'use strict' zorunlu. var yasak, const varsayilan. Magic number yasak. Tam kod garantisi — "// ... mevcut kodlar" kisaltmasi yasak. Yalnizca talep edilen degisiklik yapilir.

**K09 — Versiyonlama:** v[MAJOR].[MINOR].[PATCH]. Commit: feat/fix/refactor/chore/docs/test. Surum guncellenmeden deploy geri alinir.

**K10 — Is Mantigi:** Para hesaplamalarinda floating point yasak, integer aritmetik. Whitelist bazli dogrulama. Atomicity: islem ya tamamen basarili ya basarisiz.

**K11 — Test:** Her kritik fonksiyon min. 3 senaryo (happy/edge/error). Kritik moduller %80, genel %60 coverage. Kirik test olan PR merge edilemez. Kritik hata 24 saatte duzeltilir.

**K12 — UI/UX:** CSS custom properties ile merkezi design system. Responsive: mobil<768 / tablet 768-1024 / desktop 1024-1280 / genis>1280. Animasyon 200-300ms. prefers-reduced-motion desteklenir. Tab/Escape/Enter erisilebilirligi. WCAG AA kontrast.

**K13 — i18n:** Tum kullanici-gorunur string t('key') ile sarilir. Yeni ozellikte TR+EN birlikte eklenir. Eksik ceviri PR'da reddedilir.

**K14 — PII Maskeleme:** maskId / maskPhone / maskEmail fonksiyonlari. Admin ham veri gorur, diger roller maskelenmis. PII rest'te AES-256. KVKK/GDPR: disa aktarma + silme talebi ekrani zorunlu.

**K15 — Yedekleme:** Gunluk otomatik yedek, sifreli, min. 30 gun. TLS 1.3 transit, AES-256 rest. Basarisiz yedek → aninda uyari.

**K16 — Olceklenebilirlik:** Feature flag ile kademeli acilis. Yeni modul = yeni dosya, kod degisikligi yok. Bir degisiklik 3+ dosyayi etkiliyorsa mimari gozden gecirme.

---

### BOLUM 2 — DUAY'A OZGU KURALLAR

**D1 — Script Sirasi (KRITIK):** Firebase SDK → firebase.js → Core (translations→database→cache→utils→auth) → Moduller → app.js → app_patch.js → Hub modulleri. Bu sira degistirilemez.

**D2 — app.js Dokunulmazligi (KRITIK):** Yeni panel/routing icin app.js degistirilmez. app_patch.js uzerinden App.nav() monkey-patch yapilir.

**D3 — IIFE Zorunlulugu:** Her modul (function(){ 'use strict'; ... window.ModulAdi = {...}; })(); kalibinda yazilir.

**D4 — Veri Erisimi:** Firestore'a direkt erisim yasak. Tum erisim window.DB ve load*/save* fonksiyonlari uzerinden.

**D5 — localStorage Cache:** Magic string yasak. database.js KEYS nesnesindeki ak_* sabitleri kullanilir.

**D6 — Multi-Tenant Izolasyon:** FS_PATHS ile collection path'leri ayrilir. Tenant ID olmadan Firestore yazmasi yasaktir.

**D7 — Tema Zorunlulugu:** Her bilesen dark/light modda test edilir. Footer saati dinamik, login versiyonu statiktir (runtime'da degismez).

**D8 — i18n Uygulama:** t('key') ve data-i18n attribute'u. I18n.apply() ile DOM guncellenir.

**D9 — JSDoc Zorunlulugu:** window.* uzerine eklenen her public fonksiyon JSDoc ile belgelenir.

**D10 — ID Uretimi:** generateId() zorunlu. Date.now() veya Math.random() ile ID uretimi yasak.

---

### BOLUM 3 — CALISMA PROTOKOLU

Her gorevde sirasiyla: 1) Anla ve ozetle 2) Dosya/modulu analiz et 3) 5 gelistirme onerisi sun (ekle/cikar/guncelle/optimize/guvenlik) — onay olmadan kodlamaya gecme 4) UI varsa mockup sun 5) Teyit al 6) TAM kod yaz (kisaltma yasak) 7) Uzman ipucu ile teslim et.

---

### BOLUM 4 — KONTROL LISTESI

Her teslimde kontrol: Yalnizca talep edilen degisiklik / Hardcode secret yok / Tam kod (kisaltma yok) / Soft delete kullanildi / logActivity cagrildi / sanitize() kullanildi / PII maskelendi / IIFE + strict mode / generateId() kullanildi / JSDoc yazildi / Script sirasi dogru / TR+EN i18n eklendi / Dark/light test edildi / Min. 3 test senaryosu / 5 gelistirme onerisi sunuldu / Uzman ipucu paylasildi / Versiyon guncellendi

---

## Operasyonel Bağlam (Güncel)

### Safari Kritik Kuralları
- Her onclick'e: `event.stopPropagation()`
- UUID onclick: `onclick="window.fn?.('uuid-here')"` — escaped quotes
- Panel null fix: `renderXxx()` → `setTimeout 150ms` → `openForm()`
- grid yerine flex; position:sticky sadece tek tablo içinde
- window.fn = function() — IIFE içinde kalma, mutlaka export et

### Store/Load Haritası
| Modül | Load | Store | LS Key |
|---|---|---|---|
| Satınalma | loadSatinalma | storeSatinalma | ak_satinalma1 |
| Satış Teklif | loadSatisTeklifleri | storeSatisTeklifleri | — |
| Cari/Ödemeler | loadCari | storeCari | ak_cari1 |
| İhracat Dosya | loadIhracatDosyalar | storeIhracatDosyalar | — |
| İhracat Ürün | loadIhracatUrunler | storeIhracatUrunler | ak_ihr_urun1 |
| Kargo | loadKargo | storeKargo | ak_kargo2 |
| Görevler | loadTasks | — | Firebase |
| KPI | loadKpi | storeKpi | — |
| Pirim | loadPirim | storePirim | — |

### Aktif Fix Kuyruğu
1. ACİL-FIX-004: pusula_render.js → gecikmiş görev bannerı (28 gecikmiş)
2. ACİL-FIX-005: kpi.js → dönem güncelleme butonu (Mart→Nisan)
3. KARGO-V2: kargo.js tam yeniden yazım (tasarım onaylandı)
4. Pusula: kategori + modül bağlantısı, kanban, alt görev
5. Pirim: bonus/ceza liste, PDF slip, KPI entegrasyonu
6. KPI: 6 yeni KPI, modül bağlantısı, alarm eşikleri

### Commit Format
`fix: MODUL-FIX-NNN — açıklama`
`feat: MODUL-FEAT-NNN — açıklama`

## İşlem Süresi Standardı (ZORUNLU)

Her kod değişikliği işleminde ekrana şu bilgiyi göster:

```
⏱ İşlem: [N]/13 — [İşlem Adı]
⏳ Bu işlem: ~X dakika
⏰ Kalan tahmini: ~Y dakika (Z işlem kaldı)
```

Kurallar:
- Her commit öncesi bu bilgiyi terminale yaz
- Süre tahmini dosya satır sayısına göre: <100 satır=1dk, 100-500=3dk, 500+=5dk
- Her işlem başında ve bitişinde göster
- Format değiştirme — bu şablon sabit

## KUYRUK — Sistem Kalite Paneli (KUYRUK-001)
- Admin menüsüne "Sistem Kalitesi" alt sayfası ekle
- Elite Sistem Mimarisi tablosunu göster (5 kategori × 4 seviye)
- Her satırın yanında sistemin mevcut durumu: 🟢 İyi / 🟡 Orta / 🔴 Zayıf
- Sadece Admin rolü görebilir (getPermLevel() kontrolü)
- PDF export butonu (tam tablo)
- Zamanlama: 1. ay günlük, 2. ay haftalık, 3. ay+ aylık bildirim
- Bildirim: Admin'e platform içi + mail
- İlk durum: Mimari=Orta, Test=Zayıf, Güvenlik=Orta, UX=Orta, DevOps=Orta
