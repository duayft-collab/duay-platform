# AUDIT-SYNC-001 RAPORU

**Tarih:** 2026-04-28
**Kapsam:** Tüm modül + core senkronizasyon mimarisi
**Yapan:** T2 (read-only audit)
**HEAD:** `87f664c`

---

## 0. Yönetici Özeti — En Kritik 5 Madde

1. **AT-RENDER-FIX-001 BEKLİYOR** — Alış teklifleri için URUN-RENDER-FIX-001 ile aynı schema bridge pattern'i lazım. Şu an `loadAlisTeklifleri` field normalize etmiyor → eski LS kayıtları render'da bozuk gösteriliyor olabilir.
2. **`ak_kargo2` paralel storage** — `satin_alma_v2_form.js` `localStorage.getItem/setItem('ak_kargo2')` direkt erişimi yapıyor; `KEYS.kargo='ak_krg1'` ile uyuşmuyor → sync bypass + multi-cihaz tutarsızlık.
3. **3 collection gerçekten LS-only** — `hesapHistory`, `localDocs`, `tatilAyarlar` — Firestore sync yok. Multi-cihaz senaryosunda kayıp riski.
4. **72 direkt LS write** modüllerde (`localStorage.setItem('ak_*'...)`) — D5 ihlali. En yoğun: `dashboard.js (11)`, `app_patch.js (8)`, `odemeler.js (6)`, `muavin_parse.js (6)`, `pusula_pro.js (5)`.
5. **Schema split şüphesi** — `ak_urunler1`, `ak_satinalma1`, `ak_satis_teklif1`, `ak_cari1`, `ak_navlun1` her biri 2 dosyadan yazılıyor → her birinde inconsistent schema riski.

---

## 1. KRİTİK — Production Etkili Sorunlar

### 1.1 Alış Teklifleri Schema Bridge YOK (AT-RENDER-FIX-001)

`URUN-RENDER-FIX-001` ürün katalogu için `_normalizeUrunFields` ile şu field çiftlerini bridge ediyor:
```
duayName ↔ urunAdi
image ↔ gorsel
duayKodu ↔ urunKodu
vendorName ↔ tedarikci
```
Aynı pattern alış teklifleri için **uygulanmamış**:
- `loadAlisTeklifleri` (database.js:2042) — sadece `_dbKullaniciFiltreUygula` + isDeleted filtresi
- `storeAlisTeklifleri` (database.js:2043) — schema normalize yok

**Risk:** Eski format teklif kayıtları render'da boş gösteriliyor olabilir.

### 1.2 `ak_kargo2` Paralel Storage

**Tespit (önceden raporlandı):**
```
KEYS.kargo                    = 'ak_krg1'   ← resmi sync ✅
satin_alma_v2_form.js:1309    = 'ak_kargo2' ← bypass 🔴
satin_alma_v2_form.js:1346    = 'ak_kargo2' ← bypass 🔴
```
LOJ-FIX-001 talimatı verildi, A/B/C seçenek bekleniyor.

### 1.3 `ak_urun_db1` Migration Belirsizliği

`urun_db.js:10` `URUN_DB_KEY = 'ak_urun_db1'` — **`KEYS.urunler='ak_urunler1'` ile farklı**.
Migration kodu var (urun_db.js:583-594, "tek seferlik ak_urun_db1 → ak_urunler1") ama `loadUrunDB`/`storeUrunDB` hâlâ kendi key'inde. Dual storage devam ediyor olabilir → **production verify gerekli**.

---

## 2. ORTA — Potansiyel Sorun / İyileştirme Lazım

### 2.1 Direkt LS Write — 72 Hit, D5 İhlali

| Dosya | Sayı | Öncelik |
|---|---|---|
| dashboard.js | 11 | 🟡 view state çoğu, audit lazım |
| app_patch.js | 8 | 🟡 patch katmanı, refactor zor |
| odemeler.js | 6 | 🔴 critical data, sync riski |
| muavin_parse.js | 6 | 🟡 parser cache muhtemelen |
| pusula_pro.js | 5 | 🟡 pusula direct write — pusula KEYS'te ama _fsPath yok |
| ik_hub.js | 5 | 🟡 |
| admin.js | 5 | 🟡 |
| numuneler.js | 3 | 🟢 |
| user_settings.js | 2 | 🟢 UI state |
| satin_alma_v2_satis.js | 2 | 🔴 `ak_bankalar1`, `ak_pi_sartlar` (D5 ihlali) |
| kargo.js | 2 | 🟢 `ak_kargo_tab` UI state |
| ihracat_ops.js | 2 | 🔴 ihracat data |
| iddia.js | 2 | 🟡 |
| helpers.js | 2 | 🟡 |
| formlar.js | 2 | 🟡 |

### 2.2 Aynı LS Key'e Çoklu Modül Yazıyor (Schema Split Riski)

| LS Key | Yazan Modül Sayısı | Risk |
|---|---|---|
| ak_urunler1 | 2 | 🟢 URUN-RENDER-FIX-001 ile bridge'lendi |
| ak_satinalma1 | 2 | 🟡 schema verify lazım |
| ak_satis_teklif1 | 2 | 🟡 schema verify lazım |
| ak_alis_teklif1 | 1 | ✅ tek yazan |
| ak_cari1 | 2 | 🟡 cari_utils.js + odemeler.js |
| ak_kargo2 | 2 | 🔴 LOJ-FIX-001 (yukarıda) |
| ak_navlun1 | 2 | 🟡 navlun.js + ihracat_ops.js? verify |

### 2.3 `_listenCollection` Yapısı

- Tek noktada tanımlı: `database.js:2384`
- 5 retry pattern (1s, 30s) sağlam
- `_writingNow[collection]` echo guard ✅ (30s expiry)
- `__skipSnapshotOnce` flag ✅ (3s reset)
- **CRITICAL_COLS** (19 koleksiyon) ile **MODULE_COLLECTIONS** (40+ route map) ikili sistem
- `_noMergeCols = ['trash', 'activity', 'cari', 'satinalma', 'alisTeklifleri', 'urunler']` — bunlar tam-overwrite, append-only değil

---

## 3. DÜŞÜK — Mimari İyileştirme

### 3.1 Gerçekten LS-Only Modüller (3 adet)

| Store fn | Satır | Notu |
|---|---|---|
| `storeHesapHistory` | L2238 | Hesap geçmişi — kullanıcının kendi cihazına özel mantıklı olabilir |
| `storeLocalDocs` | L2249 | "Local" prefix, tasarımsal |
| `storeTatilAyarlar` | L2261 | Ayar ⇒ admin onayı + sync mantıklı olabilir |

### 3.2 KEYS'te Var, `_fsPath` Yok (12 adet)

```
fuarKriter, hesapHistory, navlunKarsi, lojPerf,
tatilAyarlar, inspectionFirma, gcb, alarms, alarmLog,
sozler, pusula, ppMesaj
```

**Uyarı:** Bu liste ham grep'ten çıktı. `pusula` ve `ppMesaj`'ın gerçekte `pp_mesajlar` collection'ına farklı isimle sync ediliyor (database.js:1353). `ppMesaj` aslında sync ediyor — false positive. Diğerleri için verify gerekli.

`alarms`/`alarmLog` LS-only mantıklı (kullanıcının lokal alarmları). `gcb` ihracat akışında — sync gerekli mi?

### 3.3 KEYS Sözlüğü Kapsamı

- **77 KEYS girdisi** tanımlı
- **CRITICAL_COLS:** 19 koleksiyon (kritik listener)
- **MODULE_COLLECTIONS:** 40+ route → koleksiyon eşlemesi
- **`_fsPath` çağrıları:** 65+ yerde (store fn'leri çoğu)

---

## 4. Modül-Modül Detay Tablo

### 4.1 Tam Sync (LS + Firestore) ✅

| Modül | LS Key | FS Collection | Listener (CRITICAL?) | Schema Bridge | Risk |
|---|---|---|---|---|---|
| Ürünler | ak_urunler1 | urunler | ✅ CRITICAL | ✅ URUN-RENDER-FIX-001 | 🟢 |
| Cari | ak_cari1 | cari | ✅ CRITICAL | ❌ | 🟡 schema verify |
| Alış Teklif | ak_alis_teklif1 | alisTeklifleri | ✅ CRITICAL | ❌ **eksik** | 🔴 AT-RENDER-FIX |
| Satış Teklif | ak_satis_teklif1 | satisTeklifleri | ✅ CRITICAL | ❌ | 🟡 |
| Kargo | ak_krg1 | kargo | ✅ CRITICAL | ❌ | 🔴 ak_kargo2 paralel |
| Stok | ak_stk1 | stok | ✅ CRITICAL | ❌ | 🟡 |
| CRM | ak_crm1 | crm | ✅ CRITICAL | ❌ | 🟡 |
| Ödemeler | ak_odm1 | odemeler | ❌ lazy | ❌ | 🟡 |
| Tahsilat | ak_tahsilat1 | tahsilat | ❌ lazy | ❌ | 🟡 |
| Bankalar | ak_bankalar1 | bankalar | ✅ CRITICAL | ❌ | 🟡 |
| Pusula | ak_pusula_pro_v1 | (verify) | ✅ CRITICAL | ❌ | 🟡 verify lazım |
| Notifications | ak_notif1 | notifications | ✅ CRITICAL | ❌ | 🟢 silent col |
| Activity | ak_act1 | activity | ✅ CRITICAL | ❌ | 🟢 silent col |
| Ihracat Dosya | ak_ihr_dosya1 | ihracatDosyalar | ✅ CRITICAL | ❌ | 🟡 |
| Ihracat Evrak | ak_ihr_evrak1 | ihracatEvraklar | ❌ lazy | ❌ | 🟡 |
| Ihracat Ürün | ak_ihr_urun1 | ihracatUrunler | ❌ lazy | ❌ | 🟡 |
| Numune | ak_numune1 | numune | ❌ lazy | ❌ | 🟢 |
| Pirim | ak_pirim1 | pirim | ❌ lazy | ❌ | 🟢 |
| Hedefler | ak_hdf2 | hedefler | ❌ lazy | ❌ | 🟢 |
| Update Log | ak_update_log1 | updateLog | ✅ CRITICAL | ❌ | 🟢 silent col |

### 4.2 LS-Only (Sync Yok) 🟡

| Modül | LS Key | Notu |
|---|---|---|
| Hesap History | ak_hesap1 | storeHesapHistory L2238 sync yok |
| Local Docs | ak_docs_local1 | "local" prefix tasarımsal |
| Tatil Ayarları | ak_tatil1 | Ayar ⇒ sync olmalı |

### 4.3 Belirsiz / Verify Lazım

| Modül | Durum |
|---|---|
| Alarms / AlarmLog | Lokal mı sync mi? |
| Pusula | KEYS.pusula='ak_pusula_pro_v1' ama _fsPath grep 0 — runtime'da sync ediyor mu? |
| Sözler | Statik liste mi yoksa CRUD mı? |
| GCB | Ihracat akışında, sync gerekli mi? |

---

## 5. Schema Bridge Pattern (URUN-RENDER-FIX-001 → diğerleri)

**Mevcut implementasyon (urunler):**
```js
// database.js:3994
window._normalizeUrunFields = function(u) {
  // duayName ↔ urunAdi, image ↔ gorsel, duayKodu ↔ urunKodu, vendorName ↔ tedarikci
};

// loadUrunler (L2038): okuma anında bridge
filtreli = arr.map(...).map(window._normalizeUrunFields || function(x){return x;});

// storeUrunler (L2039): yazma öncesi bridge
d = Array.isArray(d) ? d.map(window._normalizeUrunFields || function(x){return x;}) : d;
```

**AT-RENDER-FIX-001 için aynı pattern:**
```js
window._normalizeAlisTeklifFields = function(t) {
  // alisOrjPara ↔ paraBirim, urunler[].urunAdi ↔ urunler[].duayName, vb.
};
```
Schema field çiftleri tespiti için detaylı render-vs-save analizi gerekli (ayrı talimat).

---

## 6. Önerilen Aksiyon Sırası

| # | Aksiyon | Risk | Yetki | Zorluk |
|---|---|---|---|---|
| 1 | **AT-RENDER-FIX-001** — Alış teklifleri schema bridge | 🔴 production | T2 (core) | Orta — field çiftleri tespit + bridge fn |
| 2 | **LOJ-FIX-001** — `ak_kargo2` → `ak_krg1` migrate | 🔴 production | T1 (satış) | Düşük — A/B/C seçim bekliyor |
| 3 | **`ak_urun_db1` migration verify** | 🔴 production | T1 (urun_db) | Düşük — production LS bakılır |
| 4 | **D5 hot zone fix** — `odemeler.js`, `ihracat_ops.js`, `satin_alma_v2_satis.js` direct LS | 🟡 sync risk | T1+T2 | Orta — 14 hit toplam |
| 5 | **LS-only sync ekle** — `tatilAyarlar`, `hesapHistory` | 🟡 multi-cihaz | T2 | Düşük — store fn extend |
| 6 | **Cari/Satış Teklif schema verify** — Bridge gerekli mi? | 🟡 unknown | T2 | Düşük — render vs save grep |
| 7 | **Pusula sync verify** — gerçekten sync ediyor mu? | 🟡 görev kaybı riski | T3 | Düşük — runtime test |
| 8 | **GCB sync ekle** — ihracat akışında | 🟡 | T1 | Düşük |

---

## 7. Yetki Notu

- **T1** scope: `satin_alma_v2_form.js`, `urun_db.js`, `kargo.js`, `ihracat_ops.js` — LOJ-FIX-001, ak_urun_db1 migration verify
- **T2** scope: `database.js`, `cari_utils.js`, `odemeler.js`, ihracat_formlar.js?, AT-RENDER-FIX-001
- **T3** scope: `pusula_pro.js` sync verify

---

## 8. Sonraki Adım

T2 standby. Yukarıdaki 8 aksiyonun hangisinden başlanacak — kullanıcı kararı bekliyorum. Önerim: **AT-RENDER-FIX-001** (en yüksek production etkisi, URUN-RENDER-FIX-001 pattern'i hazır, T2 yetkisinde).

---
*Rapor üretim aracı: T2 read-only grep audit. Apply edilmedi — kod değişmedi. Bu dosya repo'ya commit edilmeyebilir; isterseniz `.gitignore`'a eklenebilir veya commit edilip docs altına taşınabilir.*
