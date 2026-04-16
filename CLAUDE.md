# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## **GIT MULTI-TERMINAL ZORUNLU KURAL**

**Her commit öncesi:**

1. **`git status` çalıştır**
2. **Sadece KENDİ dosyalarını listele**
3. **`git add <dosya1> <dosya2>` şeklinde EXPLICIT dosya adı ver**
4. **`git add .` veya `git add -A` veya `git commit -a` YASAK**
5. **Eğer başka terminal'in unstaged değişikliği aynı dosyada varsa — DUR, bildir, bekle**

**İhlal = attribution karışıklığı = hata kaynağı.**

Geçmişte bu kuralın ihlali birden fazla kez başka terminal'in işini yanlış commit mesajı altında push etmeye yol açtı (SATIS-SCHEMA-FILTER-001 253cc80, PUSULA-TEKRAR-001 2bed23a, SATIN-ALMA-V1-DELETE-001 fd07961). Her seferinde kod yayına gitti ama commit attribution karıştı, git history kirli, gelecekte debug/revert zorlaştı.

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

## KUYRUK-001: Sistem Kalite Paneli (Admin Alt Menü)

### Ne yapılacak:
Admin menüsüne "Sistem Kalitesi" alt sayfası eklenecek.

### Özellikler:
1. Sayfa: src/modules/admin.js içinde yeni sekme "Sistem Kalitesi"
2. Sadece getPermLevel() === 'full' görebilir
3. İçerik — 3 bölüm:
   - BÖLÜM A: Elite Sistem Mimarisi Tablosu (5 kategori × 4 seviye)
   - BÖLÜM B: Feature Matrix Tablosu (10 modül × 9 özellik)
   - BÖLÜM C: Genel Skor (Audit: 9/21 %43, LS: 1.89MB/5MB)
4. PDF Export butonu
5. "Şimdi Güncelle" butonu

### Zamanlama (ak_kalite_bildirim):
- İlk 1 ay: 2 günde bir bildirim
- 1-2. ay: haftada bir
- 2-6. ay: ayda bir
- 6. ay+: 6 ayda bir

### İlk durum (2026-04-03):
- Mimari=Orta, Test=Zayıf(%0), Güvenlik=Orta, UX=Orta, DevOps=Orta
- Öncelik: Düşük — 13 talimat bittikten sonra

## KUYRUK-002: KPI Açılmıyor (Bug)
- Semptom: KPI sayfası Safari'de render olmuyor
- Kontrol: renderKpiPanel() çağrılınca hata var mı?
- Öncelik: Yüksek — 13 talimat bittikten sonra ilk fix

## KUYRUK-003: Pirim UI Güncellenmemiş (Bug)
- Semptom: PİRİM-V2 commitleri var ama Safari'de eski görünüm
- Kontrol: hard refresh sonrası renderPirim() çıktısı
- Öncelik: Yüksek — 13 talimat bittikten sonra ikinci fix

## ⚠️ ZORUNLU UYGULAMA PROTOKOLÜ — HER TALİMATTA UYGULANIR

Bu bölümü atla, sırayı değiştir veya adım geç → hatalı uygulama.

### ADIM 1 — Talimatı anlamadan önce dosyayı oku

Talimat hangi dosyada değişiklik yapacağını söyler. O dosyayı aç. Hedef metnin gerçekten o dosyada olduğunu teyit et:

```
grep -n "HEDEF_METİN" DOSYA_ADI
```

Eğer grep 0 döndürürse — dur. Baran'a söyle: "Hedef metin bulunamadı, talimat güncel dosya ile uyuşmuyor."

### ADIM 2 — Değişikliği yap, hemen doğrula

Her tek değişiklikten sonra — hepsini bitirdikten sonra değil, her birinden hemen sonra:

```
grep -c "YENİ_METİN" DOSYA_ADI
```

Sonuç beklenen sayıyla eşleşmiyorsa değişikliği tekrar yap. Bir sonraki değişikliğe geçme.

### ADIM 3 — Syntax kontrolü

```
node --check DOSYA_ADI
```

Hata varsa commit atma. Hatayı düzelt, tekrar kontrol et.

### ADIM 4 — Raporu yaz, Baran'a göster

Commit atmadan önce şu formatı yaz:

```
UYGULAMA RAPORU — [TALİMAT_KODU]
Değişiklik 1 — [ne yapıldı]: grep → [N] ✓
Değişiklik 2 — [ne yapıldı]: grep → [N] ✓
node --check: OK ✓
Commit için onayını bekliyorum.
```

Baran "commit at" veya "ok" demeden commit atma.

### ADIM 5 — Commit at

Baran onayladıktan sonra commit at.

### YASAK DAVRANIŞLAR

- grep doğrulaması yapmadan "değiştirdim" demek
- node --check çalıştırmadan commit atmak
- "Tamamlandı" demek ama grep çıktısı paylaşmamak
- Baran onayı olmadan commit atmak
- Bulamadığım metni "buldum ve değiştirdim" diye geçiştirmek

---

## TALİMAT YAZMA KURALLARI — Claude bu kurallara uymak zorundadır

### Talimat yazmadan önce zorunlu: ADIM 0
Her talimat yazmadan önce Claude Code ilgili dosyayı okur:
```bash
wc -l DOSYA
grep -n "DEĞİŞTİRİLECEK_FONKSİYON" DOSYA
sed -n 'BAŞLANGIÇ,BİTİŞp' DOSYA
```
Çıktı buraya yapıştırılır. Claude görür, onaylar, sonra talimatı yazar.
ADIM 0 atlanırsa talimat geçersizdir.

### Talimat başı — zorunlu
Her talimatın en tepesinde:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TALİMAT : [KOD]  |  TERMİNAL : T1/T3
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Bu talimat ne yapar? — zorunlu
Her talimatın ilk bölümü iş etkisini açıklar. Teknik değil, iş dili. Max 2 cümle.

### Terminal kuralı
- **T1** — Mevcut kodu düzelten işler (bug fix, silme, refactor, standart uyumu)
- **T3** — Yeni ekran, yeni modül, yeni davranış
- T1 ve T3 aynı dosyaya aynı anda dokunamaz

### Kod satır limitleri
- T1 tipi: max 50 satır kod değişikliği
- T3 tipi: max 80 satır kod değişikliği
- Aşılıyorsa talimat ikiye bölünür

### Talimat ID formatı
`[MODUL]-[ISLEM]-[NNN]` — Örn: `T3-MV-002`, `SIL-001`, `TAKVİM-BIRLESTIR-001`
Aynı ID iki kez kullanılamaz. ID'siz talimat uygulanmaz.

### Talimat footer — zorunlu
Her talimatın en altında:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TALİMAT  : [KOD]
TERMİNAL : T1 veya T3
TARİH    : YYYY-AA-GG
SATIR    : N değişiklik / ~N satır
KELİME   : ~N
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Onay protokolü
1. Claude Code talimatı uygular
2. Uygulama Raporu yazar, Baran'a gönderir
3. Claude test eder, Baran'a bildirir: "Test geçti / Test başarısız"
4. Baran "commit at" der
5. Claude Code commit atar
Baran onayı olmadan commit atılamaz. Claude "commit at" diyemez.

### Kesin yasaklar
- ADIM 0 okumadan talimat yazmak
- Onaysız canlı veri değiştirmek (localStorage, Firestore)
- Bir talimatla birden fazla dosya değiştirmek (zorunlu değilse)
- 150+ satır tek talimat
- "Bul" metni dosyada yoksa devam etmek

---

## STANDART TALİMAT ŞABLONU — Her talimat bu formatta yazılır

Aşağıdaki şablon Claude Code için zorunlu çalışma formatıdır. Bu şablonu okuyan her yapay zeka bu formatı harfiyen uygular. Şablondan sapma yasaktır.

---

### ŞABLON BAŞLANGIÇ

## Bu talimat ne yapar?

[Teknik değil, iş etkisi. "Bu güncelleme X sorununu çözer / Y özelliğini getirir." Max 3 cümle.]

**Commit:** `tip: MODUL-ISLEM-NNN — kisa aciklama`

---

## Değiştirilecek Dosya: `dosya/yolu.js`

---

### ADIM 0 — Başlamadan önce ölç

Hiçbir değişiklik yapmadan önce şu komutu çalıştır ve çıktıyı Baran'a göster:

```bash
grep -n "HEDEF_METİN" DOSYA_ADI
node --check DOSYA_ADI && echo "SYNTAX OK"
```

Baran "devam et" demeden bir sonraki adıma geçme.

---

### DEĞİŞİKLİK N — [Değişikliğin adı]

**Bul — dosyada şu metni ara:**

[Dosyada geçen, benzersiz, tam metin. Satır numarası değil — metin. Çünkü satır numaraları kayar, metin kayamaz.]

**Değiştir — şununla:**

[Yeni metin. Kelimesi kelimesine. Claude Code yorumlamaz, birebir uygular.]

**Hemen doğrula — değişiklikten sonra:**

```bash
grep -c "YENİ_METİN" DOSYA_ADI
```

Beklenen sonuç: [N]. Farklı çıkarsa değişikliği tekrar yap. Bir sonraki değişikliğe geçme.

---

[Gerektiği kadar DEĞİŞİKLİK N bloğu tekrarlanır. Her blok kendi doğrulamasını içerir.]

---

### ZORUNLU FİNAL TEST — Commit öncesi

```bash
node --check DOSYA_ADI && echo "SYNTAX OK"
grep -c "DEĞİŞİKLİK_1_KANITI" DOSYA_ADI
grep -c "DEĞİŞİKLİK_2_KANITI" DOSYA_ADI
```

Beklenen sonuçlar:
- SYNTAX OK
- Kanıt 1: [N]
- Kanıt 2: [N]

Tüm sonuçlar beklenenle eşleşiyorsa UYGULAMA RAPORU'nu yaz ve Baran'ı bekle.

---

### UYGULAMA RAPORU

```
TALİMAT: [TALİMAT_KODU]
Değişiklik 1 — [ne yapıldı]: grep → [N] ✓
Değişiklik 2 — [ne yapıldı]: grep → [N] ✓
SYNTAX: OK ✓
Commit için onayını bekliyorum.
```

Baran "commit at" veya "ok" demeden commit atma. Kesinlikle.

---

### TALİMAT FOOTER — Her talimatın en altında bulunur

```
┌──────────────────────────────────────────────────────────────┐
│ Konu: [MODÜL]  │ Alt konu: [KONU]                           │
│ Tarih: YYYY-MM-DD  │ Satır: N  │ Kelime: N                  │
│ Başlık: [TALİMAT_KODU]                                       │
│ Not: [1-2 cümle — ne değişti, neden]                        │
└──────────────────────────────────────────────────────────────┘
```

---

### 3 ZORUNLU İPUCU — Her teslimde

Commit mesajından sonra, her zaman, tam olarak 3 ipucu yaz:

**💡 İpucu 1: [KULLANIM veya EDGE CASE]**

[2-4 cümle. Spesifik — fonksiyon adı, değişken adı, satır içerir. "Her zaman test edin" gibi genel cümleler yasak.]

→ [Tek cümle pratik not.]

**💡 İpucu 2: [PERFORMANS veya GÜVENLİK]**

[2-4 cümle. Spesifik.]

→ [Tek cümle pratik not.]

**💡 İpucu 3: [DEBUG veya GELECEK BAKIM]**

[2-4 cümle. Spesifik.]

→ [Tek cümle pratik not.]

### ŞABLON BİTİŞ

---

Bu şablonu okuyan her yapay zeka — Claude Code, Claude chat, başka model — yukarıdaki formatı eksiksiz uygular. Şablondan herhangi bir adımı atlamak yasaktır. "Zaman kazanmak için" veya "basit değişiklik olduğu için" atlamak da yasaktır. Her talimat, küçük de olsa büyük de olsa aynı disiplinle uygulanır.

---

## IP_UCU_KURALI — Her Teslimde 3 Zorunlu İpucu

Her kod tesliminin sonunda commit mesajından SONRA tam olarak 3 ipucu yaz. Atlamak yasaktır.

### Format

**💡 İpucu 1: [KULLANIM veya EDGE CASE]**

[2-4 cümle. Spesifik — fonksiyon adı, değişken adı içerir. "Her zaman test edin" gibi genel cümleler yasak.]

→ [Tek cümle pratik not.]

**💡 İpucu 2: [PERFORMANS veya GÜVENLİK]**

[2-4 cümle. Spesifik.]

→ [Tek cümle pratik not.]

**💡 İpucu 3: [DEBUG veya GELECEK BAKIM]**

[2-4 cümle. Spesifik.]

→ [Tek cümle pratik not.]

### Kural

İpuçları doğrudan teslim edilen kodla ilgili olacak. Hangi fonksiyon, hangi değişken, hangi edge case — spesifik. Genel ve jenerik yasak.

### Kategoriler

KULLANIM / EDGE CASE / PERFORMANS / GÜVENLİK / ENTEGRASYON / DEBUG / VERİ / GELECEK BAKIM

Her teslimde 3 farklı kategoriden seç.

## KOD DEĞİŞİKLİK KURALLARI — Oturumdan Öğrenildi

### KURAL: Büyük Fonksiyon Değişikliği Yasak
Tek talimatla 150+ satır fonksiyon değiştirme yasak. Yapılacaklar:
1. Fonksiyonu parçalara böl (her parça ayrı talimat)
2. Veya: fonksiyonu ayrı .tmp dosyasına yaz, node ile birleştir
3. Her değişiklik grep ile doğrulanabilir boyutta olmalı

### KURAL: display:flex Inherit Sorunu
Global CSS `.moc` çocuklarına `display:flex` uygular. Yeni panel veya liste div'i oluştururken:
- Her zaman `display:block` veya `display:flex;flex-direction:column` açıkça yaz
- Sadece `overflow-y:auto` yazmak yetmez — flex inherit gelir
- Doğrulama: `window.getComputedStyle(el).display` ile kontrol et

### KURAL: arguments[N] Kullanımı Yasak
`arguments[4]`, `arguments[5]` gibi index'li erişim yasak. Yapılacaklar:
- Fonksiyon imzasına her zaman isimli parametre ekle: `function(d, tur, seviye, urunler, gm, fw, opts)`
- Yeni parametre gerekirce imzaya ekle, geriye dönük uyumluluk için default değer ver
- `opts = opts || {}` ile güvenli erişim sağla

### KURAL: Modal İçinde position:fixed Popup Yasak
`overflow:hidden` olan bir modal içinde `position:fixed` popup (native select, tooltip vb.) çalışmaz — görünmez veya kesilir. Yapılacaklar:
- Native `<select size=N>` yerine her zaman yeni `.mo` modal aç
- Popup içerik modal üzerine ayrı div olarak `document.body.appendChild` ile ekle
- Arama input'u olan mini modal tercih et (daha kullanışlı)

---

## YANIT ALT BİLGİSİ KURALI — Zorunlu

Her uygulama raporunun en altında şu format zorunludur:

```
Terminal [N] | [YYYY-MM-DD HH:MM:SS] | Bu işlem: [N]. kez
```

Örnek:
```
Terminal 03 | 2026-04-07 17:18:44 | Bu işlem: 1. kez
```

Kurallar:
- Terminal numarası: hangi terminalde çalıştığı (01, 03 vb.)
- Zaman damgası: komutun çalıştığı an
- Bu işlem kaçıncı kez: o talimat kodunun bu oturumda kaçıncı kez uygulandığı
- Eğer ilk kez: "1. kez", ikinci deneme: "2. kez (retry)" yaz

---

## XSS-KURAL-001

- innerHTML'e kullanıcı verisi yazarken `_esc()` veya `_ppEsc()` zorunludur
- `_esc()` olmayan innerHTML yasaktır (statik template hariç)
- Her yeni innerHTML satırına `/* XSS-SAFE: statik */` veya `/* XSS-RISK: _esc() zorunlu */` yorumu zorunludur
- Talimat review'da bu kontrol yapılır

---
