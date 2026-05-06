# MASTER DATA — Ortak Veri Sözleşmesi

**Versiyon:** v194a (2026-05-06)
**Anayasa:** KX10 — "Ortak Veri Tek Kaynak"
**Kaynak:** `src/core/duay_meta.js`

---

## 1. AMAÇ

Sistemde tüm modüllerin paylaştığı ortak veriler için **tek doğru kaynak** ve **tek erişim arayüzü** belirlemek.

Yasak:
- ❌ Hardcoded ortak veri (kur, banka, IBAN, şirket bilgisi vb.)
- ❌ Aynı veriyi birden fazla yerde tutmak
- ❌ Master kaynağı bypass eden kopya değer

Zorunlu:
- ✅ Veriyi okumak için sadece **accessor** kullan
- ✅ Master kaynak yoksa fallback davranışı belirli
- ✅ Yeni feature ortak veri gerekiyorsa önce bu dokümana bak

---

## 2. MASTER ↔ ACCESSOR HARİTASI

### 2.1 Şirket Bilgisi (sirket meta)

| Master | Accessor | Caller'a dönen tip |
|--------|----------|-------------------|
| `window.DUAY_META.sirket` (frozen) | doğrudan oku | frozen object |

```js
DUAY_META.sirket.unvan_tr   // 'DUAY ULUSLARARASI TICARET LTD. STI.'
DUAY_META.sirket.unvan_en   // 'DUAY GLOBAL LLC'
DUAY_META.sirket.web        // 'www.duaycor.com'
DUAY_META.sirket.tel        // '+90 212 625 5 444'
DUAY_META.sirket.whatsapp   // '+90 532 270 5 113'
```

**Yazma:** Yasak (Object.freeze). Strict mode'da TypeError.
**Source of truth dosya:** `src/core/duay_meta.js`

### 2.2 Banka

| Master | Accessor | Caller'a dönen tip |
|--------|----------|-------------------|
| `localStorage 'ak_bankalar1'` | `DUAY_BANKA(cur)` | frozen object \| null |
| (master fn: `_loadBankalar`) | `DUAY_BANKA()` | frozen `{USD:{...},EUR:{...},...}` |

```js
DUAY_BANKA('USD')   // { hesapSahibi, banka, sube, iban, swift } — frozen
DUAY_BANKA('EUR')   // EUR banka veya 'USD' fallback
DUAY_BANKA()        // tüm bankalar — frozen
```

**Yazma:** Sadece `_saveBankalar(obj)` ile (master fn). Diğer modüller frozen alır, mutate edemez.
**Source of truth dosya:** `src/modules/satin_alma_v2_satis.js:836-837` (V196'da `core/`'a taşınacak).

### 2.3 Kur

| Master | Accessor | Caller'a dönen tip |
|--------|----------|-------------------|
| `window._saKur` (memory) + `ak_doviz_kur` (cache) | `DUAY_KUR_GET(cur)` | number \| null |
| | `DUAY_KUR_GET(cur, true)` | number (fallback'e düşer) |
| | `DUAY_KUR_GET()` | object |
| `window.DUAY_KUR_FALLBACK` (frozen) | doğrudan oku | frozen `{USD:44.55,EUR:51.70,...}` |

```js
DUAY_KUR_GET('USD')          // 44.55+ (master varsa) ya da null
DUAY_KUR_GET('USD', true)    // master null → DUAY_KUR_FALLBACK.USD = 44.55
DUAY_KUR_GET()               // tüm kurlar
```

**Yazma:** `_saKurCek()` (`satin_alma_v2.js:111`) çağrılır — API'dan günceller.
**Source of truth dosya:** `src/modules/satin_alma_v2.js:108-136`.

**Fallback değerleri:** `DUAY_KUR_FALLBACK` frozen — V194a'da eklendi. Tüm modüller `||44.55` literal yerine `||DUAY_KUR_FALLBACK.USD` kullanmalıdır (V194c migration).

### 2.4 Şartlar (PI Terms)

| Master | Accessor | Caller'a dönen tip |
|--------|----------|-------------------|
| `localStorage 'ak_pi_sartlar'` | `DUAY_TERMS()` | frozen array |
| (master fn: `_saV2Sartlar`) | | |

```js
DUAY_TERMS()             // ['Payment: ...', 'Tax: ...', ...] — frozen
DUAY_TERMS().length      // 10 (default) ya da kullanıcı şart sayısı
```

**Yazma:** Sadece `_saV2SartlarKaydet(liste)` ile.
**Source of truth dosya:** `src/modules/satin_alma_v2_satis.js:840-855` (V196'da `core/`'a taşınacak).

### 2.5 Adres (PI/PDF için)

| Master | Accessor | Caller'a dönen tip |
|--------|----------|-------------------|
| `window.PI_ADRES` | `DUAY_PI_ADRES()` | object (fallback dahil) |

```js
DUAY_PI_ADRES().sirket    // 'Duay Global LLC'
DUAY_PI_ADRES().adres     // tam adres
DUAY_PI_ADRES().tel       // telefon
```

**Source of truth dosya:** `src/modules/satin_alma_v2_pi.js:14-79` (V198'de `core/`'a taşınacak).

### 2.6 Footer (PDF/PI standart)

| Master | Accessor | Caller'a dönen tip |
|--------|----------|-------------------|
| Computed from `DUAY_META.sirket` | `DUAY_FOOTER(lang)` | string |

```js
DUAY_FOOTER()        // 'DUAY ULUSLARARASI TICARET LTD. STI. · www.duaycor.com'
DUAY_FOOTER('en')    // 'DUAY GLOBAL LLC · www.duaycor.com'
DUAY_FOOTER('tr')    // TR (default)
```

**V194a'da eklendi.** Hardcoded footer literal'leri (örn. `pdf_v2.js:253`) V194d migration'da bu fn'a bağlanacak.

---

## 3. SAĞLIK KONTROLÜ

```js
DUAY_META_HEALTH()
// { ok: true, missing: [] }     — her şey yüklü
// { ok: false, missing: ['banka', 'kur'] }  — eksik master(lar)
```

Sayfa yüklemede otomatik çağrılması önerilir (V194b'de). Eksik master varsa console error.

`DUAY_META_STATUS()` daha ayrıntılı debug — accessor sample değerlerini döndürür.

---

## 4. KX10 SÖZLEŞME KURALLARI

### 4.1 Yeni Feature Yazarken

Eğer feature ortak veri (kur, banka, IBAN, şirket adı vb.) kullanacaksa:

1. **ÖNCE bu dokümana bak** — accessor zaten var mı?
2. Accessor varsa **kesinlikle onu kullan** — doğrudan master'ı çağırma
3. Accessor yoksa **yeni accessor önerisi sun** — `core/duay_meta.js`'e ekleme cycle'ı aç
4. Hardcoded literal **YASAK**

### 4.2 İHLAL TANIMI

| Pattern | İhlal mi? |
|---------|-----------|
| `var k = window._saKur || {}; var u = k.USD;` | 🔴 EVET — `DUAY_KUR_GET('USD')` kullan |
| `var k = window._saKur && window._saKur.USD || 44.55;` | 🔴 EVET — `DUAY_KUR_GET('USD', true)` kullan |
| `var meta = { ad: 'DUAY GLOBAL LLC' };` | 🔴 EVET — `DUAY_META.sirket.unvan_en` kullan |
| `var iban = 'TR39 0006 ...';` | 🔴 EVET — `DUAY_BANKA('USD').iban` kullan |
| `var sartlar = ['Payment: 30%...', ...];` | 🔴 EVET — `DUAY_TERMS()` kullan |
| `DUAY_KUR_GET('USD')` | ✅ DOĞRU |
| `DUAY_BANKA('USD')` | ✅ DOĞRU |
| `DUAY_META.sirket.unvan_tr` | ✅ DOĞRU |

### 4.3 İHLAL DURUMUNDA

Anayasa Belge 3 KX10 §"İhlal durumu":
- Aynı veri 2 farklı yerde → BUG
- Farklı sonuç üretiyorsa → KRİTİK HATA
- Sessiz veri sapması → KX5 ihlali

İhlal kısa not olarak cycle'a yazılır, kod düzeltilir veya geri alınır (Üst Amaç §9).

---

## 5. MEVCUT İHLAL DURUMU (V193 envanteri)

V193 cycle'ı aşağıdaki ihlalleri tespit etti — V194b/c/d'de düzeltilecek:

| Veri | İhlal sayısı | Düzeltme cycle |
|------|--------------|----------------|
| Hardcoded kur (`44.55`, `38.50`) | 11 dosya | V194c |
| Hardcoded IBAN | 5 dosya | V194d |
| Hardcoded şirket unvan | 8 dosya | V194d |
| Eski kur (`38.50`) | 2 dosya (`hesap_makinesi.js`, `odemeler.js`) | V194b ACİL |
| GBP→USD IBAN bug | 1 dosya (`satin_alma_v2_satis.js:737`) | V194b ACİL |
| Placeholder IBAN UI'da | 1 dosya (`satin_alma_v2_satis.js:101`) | V194b ACİL |

V194a foundation'ı kurar. Kalan migration cycle'ları kullanır.

---

## 6. SCRIPT YÜKLEME SIRASI

```
1. core/database.js          — DUAY_KUR set, IndexedDB API
2. core/duay_meta.js         — accessor'lar (lazy delegate, sıra kritik değil)
3. core/utils.js
4. modules/satin_alma_v2.js  — _saKur tanımlı (master)
5. modules/satin_alma_v2_satis.js  — _loadBankalar, _saV2Sartlar tanımlı (master)
6. modules/satin_alma_v2_pi.js     — PI_ADRES tanımlı
7. ... (diğer modüller — accessor caller'lar)
```

Accessor'lar **lazy delegate** — `DUAY_BANKA()` çağırıldığında `_loadBankalar` yüklenmemişse `null` döner. Bu yüzden `DUAY_META_HEALTH()` startup'ta çağrılmalı.

---

## 7. SÜRÜM GEÇMİŞİ

| Versiyon | Tarih | Değişiklik |
|----------|-------|------------|
| v157 | 2026-04 | Foundation kuruldu (DUAY_META, BANKA, KUR_GET, TERMS, PI_ADRES) |
| v194a | 2026-05-06 | Object.freeze + KUR_FALLBACK + FOOTER + HEALTH eklendi; davranış uyumlu |
| v194b | TBD | P0 acil fixler (GBP, placeholder, eski kur) |
| v194c | TBD | Hardcoded kur literal migration |
| v194d | TBD | Hardcoded banka/şirket migration |
| v196 | TBD | `_loadBankalar`, `_saV2Sartlar` master fn'ları `core/`'a taşınacak |

---

## 8. ALTIN KURAL

> "Ortak bilgi kopyalanmaz, tek merkezden okunur."
> — KX10, Belge 3 v2.0

Bu doküman sözleşmedir. Kod sözleşmenin imzasıdır. Sözleşmeye aykırı kod sistemde kalmaz.
