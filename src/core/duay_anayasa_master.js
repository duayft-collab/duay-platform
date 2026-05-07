'use strict';
/* ════════════════════════════════════════════════════════════
   src/core/duay_anayasa_master.js — Anayasa Master Veri Katmanı
   V194e-1: 4 belge + KX1-KX12 yapısal liste.

   Kullanım: window.ANAYASA_CONTENT (read-only).
   UI bağlantısı V194e-2'de panel_stubs.js'e eklenecek.

   KX12 — Master Data Zorunluluğu (2026-05-07 eklendi)
   ════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  var BELGELER = [
    {
      id: '01-ust-amac-mimari-yon',
      baslik: 'Üst Amaç & Mimari Yön',
      versiyon: 'v1.3',
      tarih: '2026-05-07',
      icerik: `> "İyi yazılmış bir kural, kötü bir yöneticiden daha güçlüdür."

# 🧭 DUAY PLATFORM — Üst Amaç ve Mimari Yön Belgesi

**v1.2  ·  2026-05-07  ·  Duay Global LLC**

---

## 1. Platformun gerçek amacı

Duay Platform'un amacı; Türkiye merkezli küçük ama uluslararası çalışan bir ticaret ekibinin ihracat, satın alma, finans, lojistik, gümrük, takvim ve operasyon süreçlerini tek bir disiplinli sistemde toplamaktır.

Platform yalnız bir yazılım değil; iç ekibin hatalarını azaltan, dış paydaşları kontrollü biçimde sürece dahil eden ve şirketin operasyonel DNA'sını dijitalleştiren altyapıdır.

## 2. İç ekip ve dış paydaş ayrımı

Ana sistem iç operasyon merkezidir (öncelik). Dış portaller kontrollü giriş kapılarıdır (yardımcı kanal). Veri akışı görünür ve denetlenebilir olmak zorundadır.

| Katman | Kullanıcı | Erişim |
|---|---|---|
| İç sistem | Duay ekibi (admin / manager / lead / staff) | Tam yetki (RBAC + audit log ile sınırlı) |
| Dış portaller | Tedarikçi, müşteri, lojistikçi, gümrükçü, sigortacı | Sadece ilgili dosya/belge; upload ve teklif |

## 3. PusulaPro'nun stratejik rolü

PusulaPro bu sistemin görev modülü değil, insan ritmi modülüdür. Operasyonu değil, operatörü görünür kılar:

- Kim neye odaklanıyor
- Hangi iş gecikiyor
- Kim yük altında
- Hangi iş sahipsiz
- Günlük tempo dağılmış mı

Bugün Duay'ın iç aracıdır; orta vadede SaaS olabilir. Bu yüzden modüler, bağımsız ve tenant-ready yazılır.

## 4. Yazılım Anayasası'nın işlevi

Anayasa (K01-K16 + KX1-KX11) "yazılım nasıl yapılır" standardıdır. Her kural gerçek bir hatadan doğmuştur. Bu sayede kalıcıdır.

"Co-Authored-By: Claude" ifadesi pazarlama değil, karar geçmişi ve devir-teslim hafızasıdır.

## 5. SaaS ihtimali — bugünkü öncelik

Kısa vade: iç araç. Orta vade: SaaS potansiyeli.

Ama karar filtresi nettir:

> "Bu özellik Duay'ın bu haftaki gerçek problemini çözüyor mu?"

Cevap "hayır" ise geliştirme yapılmaz.

## 6. Tasarım ilkesi

Minimalizm + operatöre saygı.

- Doğru veri 2 tıkta ulaşılır
- Mockup sadakati zorunlu (KX7)
- CSS değişkenleri ile tema tutarlılığı (K12)
- Safari öncelikli, Chrome zorunlu
- Mobil/PWA birinci sınıf
- TR/EN/FR senkronize i18n; hardcode yasak (K13)

## 7. Güvenlik ve kontrol ilkesi

Zero trust + audit edilebilirlik.

- RBAC zorunlu (K02)
- Soft delete + 30 sn undo (K06)
- Tüm işlemler loglanır (K05)
- PII maskeleme uygulanır (K14)
- Multi-tenant izolasyon (K16)
- Saha test PASS olmadan commit yok (KX5)

## 8. Gelecek geliştirmelerde karar filtresi

Her feature için bu soruların tamamı "evet" olmalıdır:

- Bu gerçek bir problemi çözüyor mu?
- İç ekip mi, dış paydaş mı kullanacak?
- 700 satır sınırı korunuyor mu (KX9)?
- KX10 ihlali var mı?
- KX11 (modül master olamaz) ihlali var mı?
- Test ve rollback planı hazır mı?
- RBAC + audit + soft delete var mı?
- Mockup doğru mu?
- Tenant-ready mi?
- EDIT planı atomik mi?

## 9. İhlal tanımı

Bu belgeye aykırı her geliştirme ihlalli geliştirme sayılır.

| İhlal örnekleri | İhlal durumunda |
|---|---|
| 700+ dosyaya feature eklemek<br>Test yapmadan commit atmak<br>Hardcoded string kullanmak<br>Aynı veriyi 2 yerde tutmak (KX10)<br>Modül içinde master fn tanımlamak (KX11) | Kod düzeltilir veya geri alınır<br>İhlal kısa not olarak cycle'a yazılır |

## 10. Zorunlu çıktı

Her geliştirme şu dosyalarla tamamlanır:

- PLAN.md — kapsam, hedef, etki analizi
- EDIT-LIST.md — atomik EDIT planı (Çalışma Kuralları §2)
- TEST-PLAN.md — node/grep/Chrome saha test (KX5)
- ROLLBACK.md — geri dönüş yöntemi
- ACCEPTANCE.md — kabul kriterleri

Bu dosyalar yoksa geliştirme tamamlanmış sayılmaz.

## 11. Tek otorite prensibi (KX10 + KX11 ile uyumlu)

Her veri için tek doğru kaynak vardır:

| Katman | Rol |
|---|---|
| Master katman | core/database.js + platform_standartlari.js |
| Facade katman | core/duay_meta.js (DUAY_* accessor'ları) |
| Tüketici katman | tüm modüller (sadece accessor üzerinden okur) |

| Otorite | Anlamı |
|---|---|
| Firestore | veri otoritesi |
| UI | görüntü katmanı |
| Anayasa | geliştirme otoritesi |

Aynı verinin birden fazla yerde kontrol edilmesi yasaktır.
Aynı verinin birden fazla yerde TANIMLANMASI da yasaktır (KX10).
Modüller veri sahibi değil, sadece tüketicidir (KX11).

---

> **SONUÇ**
>
> Duay Platform bir yazılım değil; bir şirketin çalışma biçiminin dijital halidir.

> **YENİ KAVRAM · OPERATIONAL DNA**
>
> Bir şirketin nasıl çalıştığını belirleyen ve sistemin omurgasını oluşturan disiplin yapısıdır.

---

Belge Versiyonu: v1.2  |  2026-05-07  |  Duay Global LLC  |  brn.simsek@gmail.com


---

## Master Kaynak Notu (KX12)

**Geçiş dönemi master kaynak:**
\`src/modules/platform_standartlari.js\`

**Uzun vadeli hedef kaynak:**
\`company/master/*\` (Firestore — V194d-1d ile sync aktif)

**Master accessor'lar:**
- \`window.SIRKET_DATA\` — şirket bilgileri (12 alan)
- \`window.IBAN_DATA\` — banka/IBAN/SWIFT (3 banka × 6 alan)
- \`window.DUAY_KUR_GET()\` — döviz kuru
- \`window._saV2Sartlar()\` — PI varsayılan şartları

> Bu belge **read-only** olarak Sistem > Sistem Kuralları > Anayasa sekmesinde görüntülenir.
> Düzenleme yetkisi V194e-3'te admin/super_admin için açılacaktır.

**Güncelleme tarihi:** 2026-05-07
`
    },
    {
      id: '02-evrensel-anayasa',
      baslik: 'Evrensel Yazılım Anayasası',
      versiyon: 'v4.2',
      tarih: '2026-05-07',
      icerik: `# ⚖️ EVRENSEL YAZILIM ANAYASASI

**DUAY GLOBAL LLC**

**v4.2  —  2026-05-07**

**16 Evrensel Kural + 11 Duay Disiplin Kuralı**
**(K01-K16) + (KX1-KX11)**

brn.simsek@gmail.com  |  Tüm Projeler İçin Teknoloji-Agnostik Temel Kurallar

---

> Hızlı olmak zorunda değilsin. Ama DOĞRU olmak zorundasın.

> Kendini sıradan bir geliştirici gibi değil, SİSTEMİ KURAN BİR MİMAR gibi konumlandır.

---

## Bölüm 1 — 16 Evrensel Kural (K01-K16)

Teknoloji seçiminden bağımsız: web, mobil, backend, IoT, AI — tüm projelere uygulanır.

### Özet Tablo

| # | Kural Başlığı | Anahtar Kavram | Öncelik |
|---|---|---|---|
| 01 | Dosya Mimarisi & Modüler Yapı | Tek Sorumluluk | 🟡 Yüksek |
| 02 | Güvenlik & Yetkilendirme | Sıfır Güven | 🔴 Kritik |
| 03 | Veri Bütünlüğü & Bağımlılık | Kayıp Yok | 🔴 Kritik |
| 04 | Hata Yönetimi & Dayanıklılık | Sessiz Hata Yok | 🔴 Kritik |
| 05 | Aktivite Loglama & Audit | İzlenebilirlik | 🟡 Yüksek |
| 06 | Soft Delete & Undo Mekanizması | Silme Koruması | 🔴 Kritik |
| 07 | Performans & Optimizasyon | Hız & Verimlilik | 🟡 Yüksek |
| 08 | Kod Kalitesi & Standartlar | Okunabilirlik | 🟡 Yüksek |
| 09 | Versiyonlama & Sürüm Yönetimi | İzlenebilir Deploy | 🟡 Yüksek |
| 10 | İş Mantığı & Domain Kuralları | Doğru Hesaplama | 🔴 Kritik |
| 11 | Test & Kalite Güvence | Doğrulama | 🟡 Yüksek |
| 12 | UI/UX & Tasarım Standartları | Minimalizm | 🟡 Yüksek |
| 13 | i18n Çoklu Dil Desteği | Evrensellik | 🟡 Yüksek |
| 14 | PII Maskeleme & KVKK/GDPR | Gizlilik | 🔴 Kritik |
| 15 | Otomatik Yedekleme | Felaket Koruması | 🟡 Yüksek |
| 16 | Ölçeklenebilirlik & Gelecek | Geleceğe Hazır | 🟢 Orta |

---

## Kural Detayları (K01-K16)

### K01 — Dosya Mimarisi & Modüler Yapı

- Tek Sorumluluk İlkesi (SRP): Her dosya tek bir iş yapar.
- Core utility dosyaları: maks. 400 satır.
- Modül dosyaları: maks. 800 satır.
- Hub/orkestrasyon dosyaları: maks. 1200 satır.
- Dosya başlığı zorunlu: şirket, açıklama, anayasa referansı, tarih, versiyon.
- İsimlendirme: dosya/klasör kebab-case, değişken camelCase, sabit UPPER_SNAKE_CASE.
- GÜÇLENDİRİLMİŞ (v4.0): Pre-commit hook (scripts/verify.sh) otomatik kontrol — 800+ satır push'lanmaz.

### K02 — Güvenlik & Yetkilendirme

- Sıfır hardcode politikası: API anahtarı, şifre, token yok — .env zorunlu.
- RBAC hiyerarşisi: super_admin → admin → manager → user.
- Multi-tenant veri izolasyonu sunucu tarafında zorunlu.
- Maks. 5 hatalı giriş → 15 dakika kilit (brute-force koruması).
- Token süresi 72 saat; inaktivite 30 dakika.
- XSS koruması: innerHTML kontrolü, CSP header'ları.
- Firestore Rules detay standardı: "Her koleksiyon için read/create/update/delete ayrı yazılır" maddesi eklenmeli.
- Server-side validation: Kritik işlemler sadece frontend kontrolüne bırakılmamalı. Ödeme, fiyat, yetki, silme, onay işlemleri.
- Firebase App Check: Yetkisiz scriptlerin Firebase kaynaklarını kullanmasını azaltmak için eklenmeli.
- Dosya yükleme güvenliği: MIME type, uzantı, dosya boyutu, kullanıcı rolü, public/private erişim ve virüs tarama politikası.
- Logout sonrası cache temizliği: Service worker, localStorage, sessionStorage ve hassas IndexedDB verileri için çıkış güvenliği.
- Güvenlik test cycle'ı: Her büyük sürümde şu zorunlu olmalı: Firestore rules test, RBAC test, tenant isolation test, XSS guard.

### K03 — Veri Bütünlüğü

- Şema değişikliği migration gerektirir, deployment öncesi test.
- Object.freeze() ile APP_CONFIG dondurulur.
- Floating point KULLANILMAZ para hesaplamalarında — integer aritmetik.
- Tüm yazma işlemleri audit log'a kaydedilir.

### K04 — Hata Yönetimi

- Merkezi error handler zorunlu — toast queue sistemi.
- window.onerror + unhandledrejection global hook'ları aktif.
- Kullanıcıya anlamlı mesaj, console'a teknik log.
- try-catch içindeki hatalar LogModule'a kaydedilir.

### K05 — Aktivite Loglama

- Tüm önemli işlemler (CRUD, auth, export) loglanır.
- Log şeması: { id, uid, kullanici, rol, tip, aciklama, detay, zaman }.
- PII verileri loglarda maskelenir.

### K06 — Soft Delete & Undo

- YASAK: .delete(), .remove(), .splice() — fiziksel silme yoktur.
- Soft delete: { isDeleted: true, deletedAt, deletedBy }.
- 30 saniyelik undo penceresi — 'Geri Al' butonu toast'ta.
- Native confirm()/alert() YASAK — custom modal zorunlu.

### K07 — Performans

- Pagination: 10.000+ kayıt için sanal liste / infinite scroll.
- Chart.js: Instance destroy — memory leak yok.
- Stress test: 50K kayıt < 2.5 saniye.

### K08 — Kod Kalitesi

- var → let/const zorunlu.
- JSDoc + açıklayıcı Türkçe yorum.
- Her commit'te yalnızca talep edilen değişiklik.

### K09 — Versiyonlama

- Semver: MAJOR.MINOR.PATCH — her release version bump.
- CHANGELOG.md zorunlu.
- Git tag: v{version} formatında.

### K10 — İş Mantığı

- Tüm hesaplama formülleri dokümante edilir ve unit test ile doğrulanır.
- Division by zero, null check, sınır değer kontrolleri zorunlu.

### K11 — Test

- Her yeni feature için min. 3 unit test senaryosu.
- Sınır değerler, uç durumlar ve hata senaryoları dahil.

### K12 — UI/UX

- CSS değerleri CSS değişkenleri --xxx ile tanımlanır.
- Responsive: 768px, 1024px breakpoint testleri.
- Erişilebilirlik: ARIA etiketleri, klavye navigasyonu.

### K13 — i18n

- Tüm kullanıcı metinleri t(key) fonksiyonu ile sarılır.
- TR ve EN çevirileri senkronize tutulur.

### K14 — PII & KVKK/GDPR

- TC No, telefon, e-posta varsayılan olarak maskelenir.
- Admin: ham veri | Diğer roller: maskelenmiş.
- Veri dışa aktarma ve silme talebi admin panelinde yönetilir.

### K15 — Yedekleme

- Otomatik export/import özelliği zorunlu.
- Cloud Scheduler ile periyodik Firestore backup.
- PITR (Point-in-Time Recovery) aktif.

### K16 — Ölçeklenebilirlik

- Yatay ölçekleme için stateless mimari.
- Cache katmanı: Redis/Firestore cache.
- Future multi-tenant ready — tenant ID izolasyonu.

---

## Bölüm 2 — KX1-KX11 Duay Disiplin Kuralları (v4.1 Güncellemesi)

Duay Operasyon Platformu V117-V194 cycle'larında çıkarılan dersler. Her kural gerçek bir bug veya teknik borç sonucu doğmuştur.

### Özet Tablo

| # | Başlık | Açıklama | Çıkış Cycle'ı |
|---|---|---|---|
| KX1 | Çekirdek Sınırı | src/core/ dosyaları ≤400 satır. | V134.refactor |
| KX2 | Patch Sınırı | *_patch.js dosyaları ≤600 satır. | V134.refactor |
| KX3 | Yeni Feature = Yeni Dosya | K01 ihlal eden dosyaya feature eklenmez. | V134.refactor |
| KX4 | Refactor Önceliği | Büyük 3 dosyaya feature cycle YASAK — refactor öncelikli. | V134.refactor |
| KX5 | Saha Test Zorunluluğu | Her cycle Chrome MCP saha test PASS olmadan kapanmaz. | V125.1 |
| KX6 | Lojistik RBAC | Lojistik modüllerine yetki sistemi (manager/lead/staff). | V134.5 |
| KX7 | Mockup Sadakati | Mockup gösterildiğinde TÜM elementler kapsam dahili — 'dar kapsam' bahane değildir. | V133 |
| KX8 | Anchor View Birebir Kopya | Yeni dosya yaratırken BİLE referans veri (BELGE_META, schema, sabit) anchor view ile doğrulanır. Manuel rewrite YASAK. | V133.2 → V136 |
| KX9 | 700+ Satır Yasağı | 700 satıra ulaşan dosyaya yeni feature eklenmez — yeni dosya yaratılır. | V135 |
| KX10 | Ortak Veri Tek Kaynak | Master data + snapshot — ortak veri tek merkezden, snapshot ile teklif. | V193, V194b |
| KX11 | Tek Master, Tek Accessor | Modül master olamaz; DUAY_* accessor üzerinden okunur. | V194a |

---

## KX Kural Detayları

### KX1 — Çekirdek Sınırı (Core ≤400 satır)

- src/core/ dizinindeki tüm dosyalar maksimum 400 satır olmalıdır.
- Çekirdek dosyalar (database.js, draft_manager.js, app_init.js vb.) projenin temel altyapısıdır — şişerse tüm sistem kırılır.
- İhlal durumu: yeni dosyaya extract zorunlu, modül haline getirilir.
- Ders kaynağı: V134.refactor.0 PDF rapor, core/database.js 4841 satır = %1210 ihlal.

### KX2 — Patch Sınırı (*_patch.js ≤600 satır)

- Patch dosyaları (geçici çözüm, bug fix, monkey patch) maksimum 600 satır olmalıdır.
- Patch dosyaları doğası gereği 'geçici' olmalı, kalıcı feature için kullanılmaz.
- İhlal durumu: patch içeriği module'a refactor edilir.
- Ders kaynağı: V134.refactor.0, app_patch.js 7475 satır = %1246 ihlal.

### KX3 — Yeni Feature = Yeni Dosya

- K01 ihlal eden dosyaya yeni feature eklenmez — yeni dosya yaratılır.
- Mevcut dosya 800+ satırda ise: feature başka dosyaya yazılır, gerekirse window.* ile expose edilir.
- Bu kural KX9 ile birlikte çalışır (700+ tehlike sınırı, 800+ K01 ihlali).
- Ders kaynağı: V134.refactor strateji raporu.

### KX4 — Refactor Önceliği

- Büyük 3 dosyaya (en yüksek satır ihlali olan ilk 3) feature cycle açılması YASAK.
- Önce refactor cycle'ları yapılmalı, K01 borç kapatılmalı.
- Bu kural cycle planlamada otomatik enforcer.
- Mevcut 3 büyük dosya (V137 sonrası): odemeler.js (9560), app_patch.js (7475), ihracat_ops.js (7323).

### KX5 — Saha Test Zorunluluğu

- Her cycle Chrome MCP saha test PASS olmadan COMMIT olarak kabul edilmez.
- Saha test: gerçek tarayıcı, gerçek veri, gerçek senaryo (en az 1).
- Sadece syntax check (node --check) yetersiz — runtime davranış doğrulanmalı.
- Ders kaynağı: V125.1 cycle, syntax temiz olmasına rağmen render'da bug çıktı.

### KX6 — Lojistik RBAC

- Lojistik modüllerine 3-katmanlı yetki sistemi: manager, lead, staff.
- ED schema'ya assignedManager, assignedLead, assignedStaff alanları eklenir.
- Edit/delete/share aksiyonları rol-tabanlı kontrol edilir.
- V134.5 PERMISSIONS-001 cycle'ında implementasyon planlandı.

### KX7 — Mockup Sadakati

- Kullanıcı mockup gösterdiğinde TÜM elementler kapsam dahildir.
- 'Dar kapsam disiplini' mockup'tan eksik element çıkarmak için bahane olamaz.
- Mockup'ta 5 öğe varsa, 5 öğe uygulanır — 3 yapıp 'sonraya bırakma' YASAK.
- Ders kaynağı: V133 cycle, mockup'ta gösterilen kapasite uyarısı yapılmadı, kullanıcı 'boktan oldu' dedi.

### KX8 — Anchor View Birebir Kopya

- Yeni dosya yaratırken BİLE referans veri (BELGE_META, schema, sabit, fn body) anchor view ile doğrulanır.
- 'sed' veya 'view' tool'undan gelen çıktı BİREBİR KOPYA olarak kullanılır — manuel yeniden yazma YASAK.
- İhlal cezası: silent bug olarak 3+ cycle yaşanabilir.
- Ders kaynağı: V133.2 EDIT 2'de yeni dosya yaratılırken meta.name (yanlış field) yazıldı, 3 cycle silent bug yaşandı (V133.2 → V134 → V135).

### KX9 — 700+ Satır Yasağı

- 700 satıra ulaşan bir dosyaya YENİ feature eklenmez — yeni dosya yaratılır.
- K01 sınırı 800, ama 700-800 'tehlike bölgesi' olarak işaretlenmiştir.
- Bug fix istisna olabilir, ama feature ekleme kesinlikle yasak.
- Ders kaynağı: V135 cycle, ed.js 2092 satır - dokunmadan feature ekleme imkansız hale geldi, KX9 doğdu.

### KX10 — Ortak Veri Tek Kaynak

**Tanım:**
Sistemde kullanılan ortak veriler (banka, kur, şirket, cari, şartlar, footer/header) tek bir merkezde tutulur ve tüm modüller bu veriyi sadece o kaynaktan okur.

**Kapsam:**
- Banka bilgileri (IBAN, SWIFT, hesap sahibi, banka adı, şube)
- Döviz kurları
- Şirket bilgileri (unvan TR/EN, adres, tel, web, vergi no, mersis, ticaret sicil)
- Cari (müşteri/tedarikçi)
- PDF/PI ortak metinleri (footer, header, başlık)
- Sözleşme şartları / terms / teslim şartları
- Vergi bilgileri / resmi şirket metinleri

**Master Data Kuralları:**
1. Ortak veri birden fazla dosyada TANIMLANAMAZ.
2. Hardcoded ortak veri YASAK.
3. Kopya veri oluşturmak YASAK.
4. Her ortak veri için 1 adet SOURCE OF TRUTH zorunlu.
5. Tüm modüller veriyi bu kaynaktan OKUR (read-only).
6. Yeni feature yazılırken ortak veri yeniden yazılamaz.
7. Modüller kendi fallback kur/banka/şirket verisini oluşturamaz.
8. Fallback gerekiyorsa yalnız merkezi master-data katmanında bulunabilir.
9. HTML/PDF içine doğrudan banka veya şirket bilgisi gömülemez.
10. Ortak veriler render helper/factory üzerinden üretilir.

**Snapshot Disiplini:**
- Ticari teklifler snapshot ile çalışır.
- Satış teklifi oluşturulduğu anda alış fiyatı, kur, satıcı, maliyet, teslim süresi, ödeme şartı, marj, satış fiyatı snapshot olarak saklanır.
- Canlı alış verisi geçmiş teklifleri değiştiremez.
- Müşteriye gönderilen teklif: commercialLocked=true durumuna geçer.
- Commercial lock sonrası fiyat/kur/satıcı/maliyet/marj admin onaysız değiştirilemez.
- Değişiklik yalnız "Revision Request" sistemi ile yapılabilir.
- Her revizyon: yeni revision no üretir, eski revision'ı archive eder, audit log oluşturur.

**İhlal Durumu:**
- Aynı veri 2 farklı yerde → BUG.
- Farklı sonuç üretiyorsa → KRİTİK HATA.
- Sessiz veri sapması → KX5 ihlali.

**Amaç:**
Sessiz veri bozulmalarını önlemek; geçmiş tekliflerin sonradan değişmesini engellemek; ticari güvenilirlik sağlamak; ERP düzeyinde veri bütünlüğü kurmak; tek kaynak disiplini oluşturmak; modüller arası tutarlılık sağlamak.

**Ders kaynağı:**
V193 envanteri — Kuveyt USD IBAN platform_standartlari.js'de "5000", satis_teklif.js'de "5001" olarak tutulmuş; aynı veriyi 2 yerde tutmak canlı sapma üretmiş. V194b'de fix edildi. KX10 v4.1'de formal madde oldu.

**Altın Kural:**
> "Gönderilen ticari teklif artık serbest veri değildir; ticari taahhüttür.
> Ortak bilgi kopyalanmaz, tek merkezden okunur."

### KX11 — KX-STANDARD-001 — Tek Master, Tek Accessor

**Tanım:**
Hiçbir modül ortak kurumsal bilgilerin sahibi olamaz. Modüller yalnızca merkezi accessor kullanabilir.

KX10 ortak verinin TEK KAYNAK ilkesini tanımlar; KX11 bu verinin ERIŞİM YOLUNU sözleşmeye bağlar. KX10 "neyin master olduğunu" söyler; KX11 "modüllerin nasıl okuyacağını" söyler.

**Mimari:**
- Master katman → core/database.js (persist) + platform_standartlari.js (varsayılan)
- Facade katman → core/duay_meta.js (DUAY_* accessor'ları)
- Tüketici katman → tüm modüller (sadece accessor üzerinden okur)

**Kapsam:**
- IBAN, SWIFT, banka bilgileri
- Şirket adı, adres, vergi bilgileri, iletişim bilgileri
- Footer metinleri, ödeme notları
- Kur bilgileri
- Belge meta bilgileri

**Yasaklar:**
1. Hardcoded ortak veri YASAK.
2. Modül içi master fonksiyon (örn. _loadBankalar) YASAK — core/'a taşınır.
3. Aynı veriyi 2+ yerde tutmak YASAK; kopya değer üretmek YASAK.
4. Direct master erişim (window._saKur, PI_ADRES.X) YASAK — accessor üzerinden okunur.
5. Yeni accessor'a ihtiyaç varsa core/duay_meta.js'e eklenir; modül içinde eklenmez.
6. Duplicate bilgi üretmek anayasa ihlalidir.
7. Modül içine manuel bilgi yazmak anayasa ihlalidir.
8. Farklı modüllerde farklı versiyon taşımak anayasa ihlalidir.

**Erişim Kaynağı:**
- "Sistem Menüsü > Platform Standartları"
- Veya merkezi config/accessor katmanı.

Modüller veri sahibi değil, veri tüketicisi olmalıdır.

**Geçerli accessor'lar (V194a itibariyle):**
- DUAY_META.sirket — frozen object
- DUAY_BANKA(cur) — frozen return
- DUAY_KUR_GET(cur, useFallback)
- DUAY_KUR_FALLBACK — frozen object
- DUAY_TERMS() — frozen array
- DUAY_PI_ADRES() — object + fallback
- DUAY_FOOTER(lang) — string
- DUAY_META_HEALTH() — lightweight check
- DUAY_META_STATUS() — debug detay

**Fallback Disiplini:**
- Kritik ödeme bilgilerinde "kaynaktan okunuyor" mantığı zorunludur.
- Fallback sessiz çalışamaz.
- Eksik veri varsa kullanıcıya görünür uyarı verilmelidir.

Platform Standartları sistemi "single source of truth" kabul edilir.

**İhlal Durumu:**
- Modül kendi içinde master fn tanımlıyor → BUG (refactor zorunlu).
- Hardcoded literal kurumsal bilgi → BUG.
- Accessor bypass eden direct erişim → BUG.
- Sessiz fallback kullanımı (DUAY_KUR_GET(_, true)) audit edilmemişse → KX5 ihlali.

**Ders Kaynağı:**
V193 envanteri — 30+ noktada hardcoded kurumsal veri tespit edildi. V157'de altyapı kurulmuş ama 1 dosya dışında kullanan yok. V194a foundation kuruldu (frozen + accessor genişletme). V194b P0 sapmaları düzeltildi. KX-STANDARD-001 v4.1'de KX11 olarak formal madde oldu.

**Altın Kural:**
> "Modül master olamaz, sadece tüketici olabilir."

---



### KX12 — Master Data Zorunluluğu

Tüm modüller şirket bilgisini \`SIRKET_DATA\` üzerinden, banka/IBAN bilgisini \`IBAN_DATA\` üzerinden, kur bilgisini \`DUAY_KUR_GET()\` üzerinden okumak zorundadır.

Şirket, banka, IBAN, kur, footer, ticari şart ve benzeri merkezi bilgiler modül içine hardcoded olarak yazılamaz.

**Geçiş dönemi master kaynak:**
\`src/modules/platform_standartlari.js\`

**Uzun vadeli hedef kaynak:**
\`company/master/*\` (Firestore)

**İhlal türleri:**
- Hardcoded literal yazmak (örn. \`'DUAY GLOBAL LLC'\` yerine \`SIRKET_DATA.unvan_en\`)
- Kendi modülünde master state tutmak (örn. \`var bankalar = [...]\`)
- localStorage'dan doğrudan okumak (master accessor varken)

**Yaptırım:**
- Code review'da reddedilir
- Mevcut ihlal varsa migration cycle açılır
- Yeni feature'da hardcoded literal eklenirse PR bloklanır

**İlişkili maddeler:** KX10 (tek kaynak), KX11 (modül master sahip olamaz)

## Bölüm 3 — Sürekli Gelişim Mekanizması

HER İŞLEMDE ZORUNLU: EN AZ 5 GELİŞTİRME ÖNERİSİ

- 🟢 EKLENMESİ GEREKEN — Eksik özellik, yeni katman, yeni kontrol mekanizması
- 🔴 ÇIKARILMASI GEREKEN — Teknik borç, dead code, gereksiz bağımlılık
- 🟡 GÜNCELLENMESİ GEREKEN — Eski API, deprecated kullanım, pattern değişimi
- 🔵 OPTİMİZE EDİLMESİ GEREKEN — Performans, bellek, ağ trafiği
- 🟣 GÜVENLİK İYİLEŞTİRMESİ — Exploit kapatma, erişim kontrolü güçlendirme

Kullanıcı onayı olmadan kodlamaya geçilmez.

---

Belge Versiyonu: v4.1  |  2026-05-07  |  Duay Global LLC  |  brn.simsek@gmail.com

Tüm projeler için teknoloji-agnostik temel kurallar + Duay disiplin kuralları (KX1-KX11)


---

## Master Kaynak Notu (KX12)

**Geçiş dönemi master kaynak:**
\`src/modules/platform_standartlari.js\`

**Uzun vadeli hedef kaynak:**
\`company/master/*\` (Firestore — V194d-1d ile sync aktif)

**Master accessor'lar:**
- \`window.SIRKET_DATA\` — şirket bilgileri (12 alan)
- \`window.IBAN_DATA\` — banka/IBAN/SWIFT (3 banka × 6 alan)
- \`window.DUAY_KUR_GET()\` — döviz kuru
- \`window._saV2Sartlar()\` — PI varsayılan şartları

> Bu belge **read-only** olarak Sistem > Sistem Kuralları > Anayasa sekmesinde görüntülenir.
> Düzenleme yetkisi V194e-3'te admin/super_admin için açılacaktır.

**Güncelleme tarihi:** 2026-05-07
`
    },
    {
      id: '03-dosya-bolme-anayasasi',
      baslik: 'Dosya Bölme Anayasası',
      versiyon: 'v2.2',
      tarih: '2026-05-07',
      icerik: `# 🪚 BELGE 3 — DOSYA BÖLME ANAYASASI

**Büyük Dosyayı Parçalama Standardı | v2.1 — 2026-05-07**

V1.1 üzerine FAST/SAFE modları, uygulama paketi, manuel GitHub yasağı ve güvenli loader kuralları eklenmiştir.

**v2.1 ek:** KX10 paragrafına Anayasa v4.1 atıf notu eklendi.

---

> Dosyayı bölmek teknik iş değildir. Sistemi yeniden kurmaktır.

> Bölmek kolaydır; doğru bölmek mimaridir. Bu belge, Claude'un kör refactor yapmasını değil, kanıtlı, kontrollü ve geri alınabilir refactor yapmasını sağlamak için yazılmıştır.

---

## 0. v2.0 Güncelleme Özeti

- FAST MODE / SAFE MODE ayrımı eklendi. Amaç: hız ve güvenliği aynı anda değil, doğru aşamada kullanmak.
- Fiziksel bölme ile mantıksal refactor ayrıldı. Büyük dosya önce davranış bozulmadan parçalanabilir, sonra gerçek mimariye geçilir.
- Function constructor, eval, fetch-loader ve dinamik script enjeksiyonu canlı sistem için yasaklandı; ancak kontrollü local test için izin verilebilir.
- Manuel GitHub upload yasağı netleştirildi. Büyük refactor yalnızca local test + commit + push zinciriyle yapılır.
- Refactor paketi standardı eklendi: manifest, script order, rollback planı, test planı ve kabul kriterleri zorunlu.
- Dashboard, app.js, app_patch.js, database.js, odemeler.js gibi dosyalar için "önce check-up, sonra refactor" kuralı eklendi.

## 1. Amaç

Bu belge 700+ satır dosyaların kontrollü, veri kaybı olmadan, regresyon yaratmadan, sürdürülebilir mimariyle bölünmesini sağlar.

## 2. Tetikleyici Kurallar

| Eşik | Aksiyon | Not |
|---|---|---|
| ≥ 500 satır | Bölme hazırlığı düşünülür | Yeni feature eklenmeden önce dosya büyüme riski kontrol edilir. |
| ≥ 700 satır | Bölme cycle'ı planlanır | Yeni feature doğrudan bu dosyaya eklenmez. |
| ≥ 800 satır | K01 ihlali | Anında bölme planı gerekir. |
| ≥ 1500 satır | Acil refactor + saha test | Önce check-up raporu, sonra cycle planı. |
| ≥ 4000 satır | Çok aşamalı refactor | Tek cycle yasak. Önce fiziksel bölme / façade / modül çıkarma. |

## 3. Çalışma Modları

### 3.1 FAST MODE

Kullanım yeri: yeni modül, prototip, lokal branch, hızlı hazırlık. Canlı sistemde doğrudan push edilmez.

- Anchor view sınırlı olabilir, ama dosya haritası ve public API listesi zorunludur.
- Küçük proof-of-concept üretilebilir.
- Test edilmeden main branch'e push edilmez.

### 3.2 SAFE MODE

Kullanım yeri: canlı sistem, müşteri/veri/para/yetki içeren modüller, dashboard, database, app.js, app_patch.js.

- wc -l + shasum + sed anchor zorunlu.
- Her dosya ayrı edit, her edit sonrası node --check ve grep sanity.
- Service worker cache bump ve Chrome saha test olmadan push yok.

## 4. Bölme Türleri

| Tür | Amaç | Ne zaman kullanılır | Risk |
|---|---|---|---|
| Fiziksel Bölme | Dev dosyayı küçük parçalara ayırır, davranışı korur | 4000+ satır acil riskte, ilk aşama | Loader/script sırası riski |
| Mantıksal Refactor | Sorumluluklara göre gerçek modüllere ayırır | Fiziksel bölme sonrası veya iyi anlaşılmış kodda | Davranış değişikliği riski |
| Façade Pattern | Eski API'yi korur, içeriği yeni modüllere yönlendirir | Birçok dosya eski fonksiyonlara bağlıysa | Eski borç geçici kalabilir |
| Modül Rebuild | Yeni mimariyle yeniden kurar | Eski kod bozuk veya taşınamazsa | Yüksek test ihtiyacı |

## 5. Standart Dosya Mimarisi

\`\`\`
module/
├── styles.css          # scoped CSS + design tokens
├── core.js             # state + helpers + storage + config
├── render.js           # render fn'lar
├── handlers.js         # event handler'lar
├── api.js              # backend ile etkileşim
└── main.js             # init + bootstrap
\`\`\`

Dosya sayısı değil, sorumluluk dengesi önemlidir. 14 dosya çok değildir; tek dosya 4000 satırsa tehlikelidir.

## 6. Kesin Yasaklar

- Native alert(), confirm(), prompt() yasaktır. Custom modal / toast kullanılır.
- Inline onclick yasaktır. Event delegation kullanılır.
- innerHTML içine user data escape edilmeden basılamaz.
- eval() ve Function constructor yasaktır.
- Canlı sistemde fetch ile JS parçası okuyup Function(code) çalıştırmak yasaktır.
- Manuel GitHub upload ile büyük refactor yapmak yasaktır.
- Service worker cache bump olmadan frontend aktivasyon push edilemez.
- "Ben hatırlıyorum" veya "context'imde var" diyerek rewrite yapılamaz.

## 7. Anchor View ve Kanıt Disiplini

Mevcut kod görülmeden yeni kod yazılamaz. T2'den özet değil, ham bash STDOUT alınır.

\`\`\`
git -C ~/duay-platform status --short

echo "FILE: <hedef>.js"
wc -l ~/duay-platform/src/modules/<dir>/<hedef>.js
shasum ~/duay-platform/src/modules/<dir>/<hedef>.js
\`\`\`

Boşluk/tab şüphesi varsa macOS için cat -etv kullanılmalıdır:

\`\`\`
cat -etv ~/duay-platform/src/.../<dosya>.js | sed -n '105,120p'
\`\`\`

## 8. Refactor Paketi Standardı

Claude'a verilecek her büyük bölme paketi aşağıdaki dosyaları veya bölümleri içermelidir:

- MANIFEST.md — yeni dosya listesi, silinecek dosyalar, değişecek script tag'leri
- SCRIPT_ORDER.md — index.html yükleme sırası ve bağımlılık gerekçesi
- ROLLBACK.md — revert planı ve eski dosyaya dönüş yöntemi
- TEST_PLAN.md — node, grep, browser, Chrome saha test listesi
- ACCEPTANCE.md — kabul kriterleri
- CLAUDE-TALIMAT-*.md — kopyala-yapıştır uygulama talimatı

## 9. Uygulama Cycle Modeli

| Cycle | İş | Test | Commit |
|---|---|---|---|
| CHECK-UP | Dosya envanteri, satır sayısı, bağımlılık, risk | grep, wc, script order | Commit yok |
| SCAFFOLD | Yeni klasör/dosya iskeleti, eski API planı | node --check, wc | Ayrı commit |
| POPULATE | İçerik aktarımı, namespace bağlama | node --check + grep + unit smoke | Ayrı commit |
| ACTIVATE | index.html, CSS, script tag, sw.js cache | Chrome saha test | Ayrı commit |
| HARDEN | XSS, permissions, event delegation, cleanup | security grep + role test | Ayrı commit |

## 10. Manual GitHub Güncelleme Politikası

Büyük refactor dosyaları GitHub web arayüzünden manuel yüklenmez. Çünkü path hatası, eksik dosya, cache uyumsuzluğu, script order hatası yaratır.

| Durum | Manuel GitHub uygun mu? | Gerekçe |
|---|---|---|
| Tek satır metin değişikliği | Evet, dikkatli | Düşük risk |
| CSS küçük düzeltme | Sınırlı | Cache ve görsel test gerekir |
| Yeni modül aktivasyonu | Hayır | Script order ve sw.js gerekir |
| 4000+ satır refactor | Kesinlikle hayır | Local test + commit şart |
| Database/app_patch/app.js | Kesinlikle hayır | Sistem omurgası |

## 11. Güvenlik ve Veri Kuralları

- localStorage anahtarı değiştirilmez. Migration gerekiyorsa ayrı cycle açılır.
- Soft delete kayıtlar dashboard ve raporlarda filtrelenir.
- Yetki matrisi render öncesi ve işlem öncesi iki kez kontrol edilir.
- Para hesaplarında floating point riskine dikkat edilir; integer minor-unit veya kontrollü format kullanılır.
- Kullanıcı verisi, API cevabı ve localStorage'dan gelen veri _esc olmadan HTML'e basılmaz.

\`\`\`js
function _esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
\`\`\`

## 12. Test Zorunluluğu

\`\`\`
git -C ~/duay-platform status --short
node --check <dosya.js>
grep -Rni "alert(\\|confirm(\\|prompt(" src index.html
grep -Rni "innerHTML" src/modules/
\`\`\`

- Console error 0 olmalı.
- Chrome saha test olmadan aktivasyon tamam sayılmaz.
- Network panelde yeni dosyalar 200 dönmeli; 404 kabul edilmez.
- Service worker eski cache göstermemeli.

## 13. Dashboard ve Ana Dosyalar İçin Özel Kural

Dashboard, app.js, app_patch.js, database.js, odemeler.js, ihracat_ops.js gibi dosyalar önce check-up raporu alır. Rapor olmadan refactor başlatılamaz.

| Dosya tipi | Öncelik | Yaklaşım |
|---|---|---|
| app.js | P0 | Önce public API haritası, sonra façade + modül çıkarma |
| database.js | P0 | Storage/read/write/sync/hydration ayrımı |
| app_patch.js | P0 | Patch registry, override listesi, riskli monkey patch analizi |
| odemeler.js | P0 | Form, approval, budget, render, io, permission ayrımı |
| dashboard | P1 | Önce envanter, sonra module/dashboard yapısı |

## 14. Claude Komut Disiplini

- Claude önce rapor verir, izin almadan edit yapmaz.
- Her cycle başlığı net olur: MODUL-REF-001 gibi.
- T2 komutları kısa, tek amaçlı ve onaylanabilir olur.
- "Yes, allow all edits" seçilmez. Her kritik edit tek tek onaylanır.
- Output ham verilir; tablo/yorum istenmedikçe eklenmez.

## 15. Kabul Kriterleri

- Tüm aktif dosyalar mümkünse <500, kesinlikle <800 satır.
- Namespace düzenli; global function yok veya façade ile geçici olarak sınırlandırılmış.
- Veri korunmuş; localStorage ve Firestore anahtarları bozulmamış.
- Native alert/confirm/prompt yok.
- Inline onclick yok veya V1 geçiş borcu olarak kayıt altına alınmış.
- XSS guard uygulanmış.
- index.html script order doğru.
- sw.js CACHE_NAME ve CACHE_VERSION birlikte güncellenmiş.
- Chrome saha test PASS.
- Rollback planı mevcut.

## 16. Altın Kural

> Hız, güvenliği ezemez; güvenlik de sistemi felç edemez. Bu yüzden önce mod seçilir: FAST mı SAFE mi? Sonra iş yapılır.

> Dosyayı bölmek teknik iş değildir. Sistemi yeniden kurmaktır.

---

\`\`\`
═══════════════════════════════
KX10 — ORTAK VERİ TEK KAYNAK KURALI
(Anayasa v4.1'de formal madde olarak yer aldı —
 bu Belge KX10'un ham/operasyonel metnidir)
═══════════════════════════════
\`\`\`

**Tanım:**
Sistemde kullanılan ortak veriler (banka, kur, şirket, cari, şartlar vb.) tek bir merkezde tutulur ve tüm modüller bu veriyi sadece o kaynaktan okur.

**KAPSAM:**
- Banka bilgileri (IBAN, SWIFT, hesap sahibi, banka adı, şube)
- Döviz kurları
- Şirket bilgileri
- Cari (müşteri/tedarikçi)
- PDF ortak metinleri
- Sözleşme / şartlar

**KURALLAR:**
1. Ortak veri birden fazla dosyada TANIMLANAMAZ
2. Hardcoded ortak veri YASAK
3. Kopya veri oluşturmak YASAK
4. Her ortak veri için 1 adet SOURCE OF TRUTH zorunlu
5. Tüm modüller veriyi bu kaynaktan OKUR (read-only)
6. Yeni feature yazılırken ortak veri yeniden yazılamaz
7. Ortak veri gerekiyorsa önce mevcut kaynak araştırılır
8. Eğer yoksa yeni ortak modül tasarlanır (ör: shared/config)

**İHLAL DURUMU:**
- Aynı veri 2 farklı yerde ise → BUG
- Farklı sonuç üretiyorsa → KRİTİK HATA
- Sessiz veri sapması → KX5 ihlali

**AMAÇ:**
Veri tutarlılığı, bakım kolaylığı, silent bug önleme

**ALTIN KURAL:**
> "Ortak bilgi kopyalanmaz, tek merkezden okunur."

---

Belge Versiyonu: v2.1  |  2026-05-07  |  Duay Global LLC  |  brn.simsek@gmail.com

Anayasa v4.1 ile birlikte okunur. KX10 formal metni Anayasa Bölüm 2'dedir.


---

## Master Kaynak Notu (KX12)

**Geçiş dönemi master kaynak:**
\`src/modules/platform_standartlari.js\`

**Uzun vadeli hedef kaynak:**
\`company/master/*\` (Firestore — V194d-1d ile sync aktif)

**Master accessor'lar:**
- \`window.SIRKET_DATA\` — şirket bilgileri (12 alan)
- \`window.IBAN_DATA\` — banka/IBAN/SWIFT (3 banka × 6 alan)
- \`window.DUAY_KUR_GET()\` — döviz kuru
- \`window._saV2Sartlar()\` — PI varsayılan şartları

> Bu belge **read-only** olarak Sistem > Sistem Kuralları > Anayasa sekmesinde görüntülenir.
> Düzenleme yetkisi V194e-3'te admin/super_admin için açılacaktır.

**Güncelleme tarihi:** 2026-05-07
`
    },
    {
      id: '04-calisma-kurallari',
      baslik: 'Çalışma Kuralları',
      versiyon: 'v1.2',
      tarih: '2026-05-07',
      icerik: `# 🩺 ÇALIŞMA KURALLARI

**Claude.md ↔ Claude (T1) ↔ Kullanıcı**

**v1.3  —  2026-05-07**

**3-Rol Disiplini · Anchor View · Atomik EDIT · Saha Test**

Duay Operasyon Platformu için geliştirilmiştir.

> Anchor view birebir kopya. Manuel yazma YASAK.

Bu belge Duay'da çalışan herkesin (Claude, Claude Code/Claude.md, kullanıcı) uyması gereken disiplini tanımlar.

---

## 1. Roller ve Sorumluluklar

Duay geliştirmesinde 3 ayrı rol vardır. Her rolün net sorumluluğu vardır.

| Rol | Kim | Sorumluluk |
|---|---|---|
| T1 (Claude) | Anthropic Claude — claude.ai chat | Spec yazar, plan kurar, anchor view ister, diff hazırlar, saha test yorumlar. |
| T2 (Claude.md) | Claude Code (terminal) — /Users/baran/duay-platform | Anchor view yapar, str_replace uygular, sanity kontrol eder, commit/push. |
| Kullanıcı (Baran) | Duay sahibi | Talep verir, plan onaylar, diff'leri "1 Yes" ile geçer, saha test feedback'i verir. |

### Akış Şeması

\`\`\`
Kullanıcı → T1 (Claude) → Plan/Spec yazar
T1 → T2 (Claude.md) → Anchor view komutu yapıştırır
T2 → T1 → Anchor çıktısı raporlar
T1 → Kullanıcı → Diff hazırlar, '1 Yes' bekler
Kullanıcı → '1 Yes' → T2 EDIT uygular
T2 → Sanity → Commit → Push → T1 saha test
\`\`\`

---

## 2. Cycle Disiplini (4-Aşama)

Her cycle aşağıdaki 4 aşamayı sırasıyla geçer. Aşama atlanmaz.

**Aşama 1: Keşif** — Ground truth + anchor view raporu (T2 yapar, T1 yorumlar).
**Aşama 2: Talimat** — T1 atomik EDIT planı yazar (5 EDIT genelde).
**Aşama 3: Uygulama+Onay** — Her EDIT için: T2 diff sunar → kullanıcı '1 Yes' → T2 apply.
**Aşama 4: Verify+Commit+Push** — Final sanity → commit → push → T1 Chrome MCP saha test.

### Atomik EDIT Yapısı

Her cycle 5 EDIT'e bölünür (genel pattern):

- EDIT 1: Ana dosya değişikliği (kod, schema, fn)
- EDIT 2: İkincil dosya (eğer varsa, bağımlı dosya)
- EDIT 3: sw.js cache version bump + V### yorum
- EDIT 4: index.html cache busting (?v=YYYYMMDDV###)
- EDIT 5: Final sanity 3 dosya + commit + push + saha test

---

## 3. Anchor View Disiplini (KX8)

Bir dosyayı düzenlemeden ÖNCE, T2 mevcut içeriği 'sed' veya 'view' ile gösterir. T1 bu çıktıyı BİREBİR KOPYA-YAPIŞTIR olarak ESKİ bloğa koyar.

### Neden?

V133.2 cycle'ında yeni bir dosya yaratırken anchor view atlandı. Sonuç:

- BELGE_META schema'sında 'name' field'ı YOK, 'label' field'ı var.
- Manuel yazılan kod 'meta.name' kullandı → her zaman undefined.
- Modal başlığı 3 cycle (V133.2 → V134 → V135) raw key gösterdi.
- Bug V136'da bulundu, fix edildi. KX8 doğdu.

### Doğru/Yanlış Örnekleri

| ✅ DOĞRU | ❌ YANLIŞ |
|---|---|
| T1: 'Claude.md, sed -n 50,55p file.js komutunu çalıştır.' | T1: 'Sanırım dosya şöyle olmalı...' (manuel tahmin) |
| T1: T2'nin yapıştırdığı çıktıyı ESKİ bloğa BİREBİR kopyalar. | T1: Çıktıyı kendi indent/format anlayışıyla yeniden yazar. |
| Yeni dosya yaratırken bile ref schema (BELGE_META) anchor view ile doğrulanır. | 'Yeni dosya, anchor gerek yok' → KX8 ihlali. |

---

## 4. Disiplin Kuralları Özeti (KX1-KX11)

Anayasa v4.1'de tanımlanan 11 disiplin kuralının cycle akışına uygulanışı:

**KX1 — src/core/ ≤400 satır**
→ Çekirdek dosyaya yeni satır eklenmeden önce kontrol et.

**KX2 — *_patch.js ≤600 satır**
→ Patch dosyaları 600'ü aşarsa module'a refactor zorunlu.

**KX3 — Yeni feature = yeni dosya**
→ K01 ihlal eden dosyaya feature eklenmez (KX9 ile birlikte).

**KX4 — Refactor önceliği**
→ Büyük 3 dosyaya feature cycle açılması yasak.

**KX5 — Saha test zorunlu**
→ Chrome MCP saha test PASS olmadan commit kabul edilmez.

**KX6 — Lojistik RBAC**
→ manager/lead/staff yetkileri ED schema'sında.

**KX7 — Mockup sadakati**
→ Mockup'taki TÜM elementler kapsam dahili.

**KX8 — Anchor view birebir kopya**
→ Yeni dosya bile referans veriyi anchor view ile doğrula.

**KX9 — 700+ satır yasağı**
→ 700+ dosyaya feature ekleme yasak — yeni dosya yarat.

**KX10 — Ortak veri tek kaynak**
→ Aynı veri 2 yerde tutulamaz; tek master + tek accessor.

**KX11 — KX-STANDARD-001 — Tek master, tek accessor**
→ Modül master olamaz; sadece DUAY_* accessor üzerinden okur.

---

## 5. Cycle Künye Formatı

T1 her cycle başında aşağıdaki formatta künye yazar:

\`\`\`
═══════════════════════════════════════════════════
CYCLE:    V### CYCLE-NAME-001
EDIT:     ATOMIC — kısa açıklama
T2-PREV:  <son commit hash>

AMAÇ:     Net bir cümle
KAPSAM:   3-5 madde

ANAYASA UYUMU:
✅ K01 (dosya satır kontrolü)
✅ KX5 saha test zorunlu
✅ KX8 anchor view birebir kopya

EDIT sayısı: 5 atomik
═══════════════════════════════════════════════════
\`\`\`

---

## 6. Onay Disiplini

Kullanıcı her EDIT'i "1 Yes" ile onaylar. Onay yoksa apply YASAK.

### Onay Sözcükleri

| Onay (apply) | Ret (revert/dur) | Belirsiz (sor) |
|---|---|---|
| 1 Yes / yes / onay / tamam / devam et / hadi / 1 | hayır / no / dur / iptal / vazgeç / 2 | Eksik bilgi → T1 bekler, sormadan apply etmez |

---

## 7. Saha Test Disiplini (KX5)

Her cycle Chrome MCP saha test PASS olmadan kapanmaz. Sadece syntax check yetersiz.

### Saha Test Adımları

- Cache temizle: navigator.serviceWorker.getRegistrations + caches.delete
- Sayfayı yeniden yükle: navigate + 8sn wait
- Yeni cache versiyonunu doğrula: caches.keys()
- Yeni script tag'i doğrula: querySelectorAll('script[src*=...]')
- Davranış testi: gerçek senaryo (slot tıkla, modal aç, fn çağır vb.)
- DOM doğrulaması: innerText, getBoundingClientRect, modal width vb.

### Test PASS Kriterleri

- ✅ Cache yeni versiyona güncellenmiş
- ✅ Hedef davranış canlıda doğru çalışıyor
- ✅ Mevcut davranışlar bozulmamış (regression yok)
- ✅ Console'da error yok
- ✅ Markdown sızıntı yok (gerçek dosyada \`\\]\\(http\` pattern 0)

---

## 8. Komut Formatı

T1 → T2 komutları aşağıdaki kurallara uyar:

### ✅ Doğru

- Tek copy ile alınabilen, tek satır komut
- Çorba olmamış, açıklama içermez (komut blok dışında)
- Çıktıyı yorumlamak için comment/echo kullan

\`\`\`
sed -n '168,172p' src/modules/expected_deliveries_docs_ui.js
\`\`\`

### ❌ Yanlış

- Komut + açıklama karışık
- Birden fazla komut tek copy bloğunda (ezilir)
- Markdown link otomatik dönüşümü olan input (örn http://...)

\`\`\`
# Önce şunu yap, sonra şunu... (YASAK formatı)
\`\`\`

### Sanity Check Komutu

EDIT sonrası sanity check komutu şu yapıda olur:

\`\`\`
cd ~/duay-platform && \\
  echo -n 'kontrol1: ' && grep -c 'pattern' file && \\
  echo -n 'kontrol2: ' && (grep -c 'eski' file || true) && \\
  echo '=== node --check ===' && \\
  node --check file && echo 'OK' && \\
  echo '=== wc -l ===' && \\
  wc -l file
\`\`\`

---

## 9. Cycle Numaralandırma

### Cycle İsimlendirme Pattern

\`V### MODULE-AREA-NN\`

| Format | Açıklama | Örnek |
|---|---|---|
| V### | Yeni feature/bug fix cycle. Sayı sıralı artır. | V137, V138 |
| V###.refactor.N | K01 borç kapatma EXTRACT cycle. Sıralı kademeli. | V137.refactor.1, V137.refactor.2 |
| V###.M | Aynı cycle'ın alt-cycle'ı (genellikle bug fix follow-up). | V133.1, V133.2, V134.1 |

### Örnekler:

\`\`\`
V137 SHIPMENT-DOC-MODAL-IMPROVE-001
V137.refactor.1 SHIPMENT-ED-REMINDER-EXTRACT-001
V134.5 PERMISSIONS-001
\`\`\`

---

## 10. Commit Message Format

Her commit aşağıdaki yapıya uyar:

\`\`\`
[type](CYCLE-NAME): kısa başlık

PROBLEM:
Net bir cümleyle problem.

ÇÖZÜM (X dosya, +N satır net):
EDIT 1 (file 0): değişiklik açıklaması
EDIT 2 (file +1): değişiklik açıklaması

ANAYASA UYUMU:
✅ K01 file XX/800 (durum)
✅ KX5 saha test zorunlu

DAVRANIŞ:
A) Birinci davranış değişikliği

DOKUNULMADI:
- Diğer dosyalar

SONRAKI CYCLE PLANI:
- V### açıklama

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
\`\`\`

---

## 11. Tarihçe — Cycle'lardan Çıkan Dersler

Her ders bir gerçek hatadan doğmuştur. Tekrarlamamalıyız.

**V125.1** — Card render + table render aynı cycle'da yapılır.
Kaynak: Tek cycle hızı

**V126/V127** — ESKİ blok birebir kopyala-yapıştır, manuel yeniden yazma YASAK.
Kaynak: Indent/text errors 3 kez tekrarlandı

**V130** — Display render layer auto-link'leri, markdown leakage \`\\]\\(http\` patternı 0 olmalı.
Kaynak: Markdown sızıntı sorunu

**V133** — Mockup gösterildiğinde TÜM elementler kapsam dahilinde — 'dar kapsam' bahane değil.
Kaynak: Kapasite uyarısı atlandı, kullanıcı 'boktan oldu' dedi

**V133.2 → V136** — Yeni dosya yaratırken BİLE referans veri (BELGE_META) anchor view ile doğrula.
Kaynak: 3 cycle silent bug yaşandı (meta.name vs meta.label)

**V134.refactor** — K01 ihlal eden 31 dosya tespit edildi. Refactor öncelikli.
Kaynak: Repo health check-up, PDF rapor

**V135** — 700+ satır dosyaya feature ekleme YASAK — yeni dosya yarat (KX9).
Kaynak: ed.js 2092 satır = %261 ihlal

**V193** — Master kaynak envanteri çıkarıldı; platform_standartlari.js master rolü tespit edildi.
Kaynak: 30+ noktada hardcoded kurumsal veri.

**V194a** — core/duay_meta.js foundation kuruldu (frozen + 9 accessor).
Kaynak: Migration öncesi accessor altyapı zorunluluğu.

**V194b** — P0 veri sapmaları düzeltildi (GBP IBAN, placeholder, eski 38.50 kur, Kuveyt 5001 sapma).
Kaynak: V193 envanteri, KX10 canlı ihlal kanıtı.

**V194a-DOC** — Anayasa v4.1: KX10 + KX11 (KX-STANDARD-001) formal madde.
Kaynak: Migration öncesi disiplin yazılı olmalı.

---

Belge Versiyonu: v1.1  |  2026-05-07  |  Duay Global LLC  |  brn.simsek@gmail.com

Anayasa v4.1 ile birlikte okunur. KX1-KX11 disiplin kuralları için Anayasa Bölüm 2.


---

## Master Kaynak Notu (KX12)

**Geçiş dönemi master kaynak:**
\`src/modules/platform_standartlari.js\`

**Uzun vadeli hedef kaynak:**
\`company/master/*\` (Firestore — V194d-1d ile sync aktif)

**Master accessor'lar:**
- \`window.SIRKET_DATA\` — şirket bilgileri (12 alan)
- \`window.IBAN_DATA\` — banka/IBAN/SWIFT (3 banka × 6 alan)
- \`window.DUAY_KUR_GET()\` — döviz kuru
- \`window._saV2Sartlar()\` — PI varsayılan şartları

> Bu belge **read-only** olarak Sistem > Sistem Kuralları > Anayasa sekmesinde görüntülenir.
> Düzenleme yetkisi V194e-3'te admin/super_admin için açılacaktır.

**Güncelleme tarihi:** 2026-05-07
`
    },
  ];

  var KX_KURALLARI = [
    {
      id: 'KX1',
      baslik: 'Tek Sorumluluk',
      durum: 'aktif',
      tarih: '2026-04-15',
      aciklama: 'Her dosya tek bir sorumluluk taşır.'
    },
    {
      id: 'KX2',
      baslik: 'Anchor View Birebir Kopya',
      durum: 'aktif',
      tarih: '2026-04-15',
      aciklama: 'Manuel yazma yasak — Read/sed çıktısı verbatim kopyalanır.'
    },
    {
      id: 'KX3',
      baslik: 'Atomik EDIT',
      durum: 'aktif',
      tarih: '2026-04-15',
      aciklama: 'Her EDIT atomik, tek hedef, tek onay.'
    },
    {
      id: 'KX4',
      baslik: 'Cycle Bütünlüğü',
      durum: 'aktif',
      tarih: '2026-04-15',
      aciklama: 'PLAN + EDIT-LIST + apply + saha test + commit.'
    },
    {
      id: 'KX5',
      baslik: 'Saha Test Zorunlu',
      durum: 'aktif',
      tarih: '2026-04-15',
      aciklama: 'Her cycle Chrome MCP ile saha doğrulamadan kapanmaz.'
    },
    {
      id: 'KX6',
      baslik: 'Geriye Uyumluluk',
      durum: 'aktif',
      tarih: '2026-04-15',
      aciklama: 'Mevcut global adlar korunur, accessor pattern kullanılır.'
    },
    {
      id: 'KX7',
      baslik: 'Cache Bump Disiplini',
      durum: 'aktif',
      tarih: '2026-04-15',
      aciklama: 'Her dosya değişikliği sonrası cache key + sw-v2 bump.'
    },
    {
      id: 'KX8',
      baslik: 'Anchor View Sözleşmesi',
      durum: 'aktif',
      tarih: '2026-04-15',
      aciklama: 'İlk apply öncesi anchor view göster, sonra diff göster, sonra 1 Yes.'
    },
    {
      id: 'KX9',
      baslik: 'Dosya 700+ Satır Tehlike',
      durum: 'aktif',
      tarih: '2026-04-15',
      aciklama: '700 satır üzeri dosyalar bölme planına alınır.'
    },
    {
      id: 'KX10',
      baslik: 'Ortak Veri Tek Kaynak',
      durum: 'aktif',
      tarih: '2026-04-15',
      aciklama: 'Aynı veri birden fazla yerde tutulamaz.'
    },
    {
      id: 'KX11',
      baslik: 'Modül Master Sahip Olamaz',
      durum: 'aktif',
      tarih: '2026-04-15',
      aciklama: 'Modül globally shared veriyi sahiplenemez — accessor üzerinden okur.'
    },
    {
      id: 'KX12',
      baslik: 'Master Data Zorunluluğu',
      durum: 'aktif',
      tarih: '2026-05-07',
      aciklama: 'Şirket, banka, IBAN, kur ve PI şartları SIRKET_DATA / IBAN_DATA / DUAY_KUR_GET / _saV2Sartlar üzerinden okunmak zorundadır.'
    },
  ];

  window.ANAYASA_CONTENT = Object.freeze({
    belgeler: BELGELER,
    kx_kurallari: KX_KURALLARI,
    meta: Object.freeze({
      versiyon: '2026-05-07-V194e-1',
      toplam_belge: BELGELER.length,
      toplam_kx: KX_KURALLARI.length,
      master_kaynak_gecis: 'src/modules/platform_standartlari.js',
      master_kaynak_uzun_vade: 'company/master/* (Firestore)'
    })
  });

  console.log('[ANAYASA_CONTENT] v1.0 yüklendi:', BELGELER.length, 'belge,', KX_KURALLARI.length, 'KX maddesi');
})();
/* ════════════════════════════════════════════════════════════
   V194e-3b: DUAY_ANAYASA_GET accessor
   KX11 + KX12 uyumlu — modül buradan okur, master burada.
   ════════════════════════════════════════════════════════════ */
window.DUAY_ANAYASA_GET = function() {
  return window.ANAYASA_CONTENT || null;
};
console.log('[DUAY_ANAYASA_MASTER] V194e-3b accessor hazır');
