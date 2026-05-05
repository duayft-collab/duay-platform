> "İyi yazılmış bir kural, kötü bir yöneticiden daha güçlüdür."

---

# 🧭 DUAY PLATFORM — Üst Amaç ve Mimari Yön Belgesi

**v1.2 · 2026-05-05 · Duay Global Trade Company**

> **Ana Referans Dokümanı.** Bu belge sadece okunmaz; geliştirme süreçlerini zorlar.
> Manifestoya aykırı feature reddedilir, manifestoya aykırı kod commit edilmez (KX11).

---

## 1. Platformun gerçek amacı

Duay Platform'un amacı; Türkiye merkezli küçük ama uluslararası çalışan bir ticaret ekibinin ihracat, satın alma, finans, lojistik, belge, müşteri ve günlük iş takibi disiplinini tek bir dijital işletim sisteminde toplamaktır.

Platform yalnız bir yazılım değil; iç ekibin hatalarını azaltan, dış paydaşları kontrollü biçimde sürece dahil eden ve şirket sahibinin zihnindeki operasyon bilgisini kişilere bağımlı kalmayacak şekilde kurumsal hafızaya dönüştüren bir **operasyonel işletim sistemidir**.

---

## 2. İç ekip ve dış paydaş ayrımı

Ana sistem iç operasyon merkezidir (öncelik). Dış portaller kontrollü giriş kapılarıdır (yardımcı kanal). Veri akışı görev-sınırlı ve kontrollüdür.

| Katman        | Kullanıcı                                           | Erişim                                      |
| ------------- | --------------------------------------------------- | ------------------------------------------- |
| İç sistem     | Duay ekibi (admin / manager / lead / staff)         | Tam yetki (RBAC + audit log ile sınırlı)    |
| Dış portaller | Tedarikçi, müşteri, lojistikçi, gümrükçü, sigortacı | Sadece ilgili dosya/belge; upload ve teklif |

---

## 3. PusulaPro'nun stratejik rolü

PusulaPro bu sistemin görev modülü değil, **insan ritmi modülüdür**.

Operasyonu değil, operatörü görünür kılar:

- Kim neye odaklanıyor
- Hangi iş gecikiyor
- Kim yük altında
- Hangi iş sahipsiz
- Günlük tempo dağılmış mı

Bugün Duay'ın iç aracıdır; orta vadede SaaS olabilir. Bu yüzden modüler, bağımsız ve tenant-ready yazılır.

---

## 4. Yazılım Anayasası'nın işlevi

Anayasa (K01-K16 + KX1-KX10) "yazılım nasıl yapılır" standardıdır.

Her kural gerçek bir hatadan doğmuştur. Bu sayede kalite kişiye değil **sisteme** bağlıdır.

"Co-Authored-By: Claude" ifadesi pazarlama değil, **karar geçmişi ve devir-teslim hafızasıdır.**

---

## 5. SaaS ihtimali — bugünkü öncelik

Kısa vade: iç araç
Orta vade: SaaS potansiyeli

Ama karar filtresi nettir:

> "Bu özellik Duay'ın bu haftaki gerçek problemini çözüyor mu?"

Cevap "hayır" ise geliştirme yapılmaz.

---

## 6. Tasarım ilkesi

Minimalizm + operatöre saygı

- Doğru veri 2 tıkta ulaşılır
- Mockup sadakati zorunlu (KX7)
- CSS değişkenleri ile tema tutarlılığı (K12)
- Safari öncelikli, Chrome zorunlu
- Mobil/PWA birinci sınıf
- TR/EN/FR senkronize i18n, hardcode yasak (K13)

---

## 7. Güvenlik ve kontrol ilkesi

Zero trust + audit edilebilirlik

- RBAC zorunlu (K02)
- Soft delete + 30 sn undo (K06)
- Tüm işlemler loglanır (K05)
- PII maskeleme uygulanır (K14)
- Multi-tenant izolasyon (K16)
- Saha test PASS olmadan commit yok (KX5)

---

## 8. Gelecek geliştirmelerde karar filtresi

Her feature için bu soruların tamamı "evet" olmalıdır:

1. Bu gerçek bir problemi çözüyor mu?
2. İç ekip mi dış paydaş mı kullanacak?
3. 700 satır sınırı korunuyor mu (KX9)?
4. KX10 ihlali var mı?
5. Test ve rollback planı hazır mı?
6. RBAC + audit + soft delete var mı?
7. Mockup doğru mu?
8. Tenant-ready mi?
9. EDIT planı atomik mi?

---

## 9. İhlal tanımı

Bu belgeye aykırı her geliştirme **ihlalli geliştirme** sayılır.

İhlal örnekleri:

- 700+ dosyaya feature eklemek
- Test yapmadan commit atmak
- Hardcoded string kullanmak
- RBAC olmadan işlem açmak

İhlal durumunda:

- Kod düzeltilir veya geri alınır
- İhlal kısa not olarak cycle'a yazılır

---

## 10. Zorunlu çıktı

Her geliştirme şu dosyalarla tamamlanır:

- PLAN.md
- EDIT-LIST.md
- TEST-PLAN.md
- ROLLBACK.md
- ACCEPTANCE.md

Bu dosyalar yoksa geliştirme tamamlanmış sayılmaz.

---

## 11. Tek otorite prensibi

Her veri için tek doğru kaynak vardır:

- Firestore → veri otoritesi
- UI → görüntü katmanı
- Anayasa → geliştirme otoritesi

Aynı verinin birden fazla yerde kontrol edilmesi yasaktır.

---

## SONUÇ

Duay Platform bir yazılım değil;
bir şirketin çalışma biçiminin dijital halidir.

Amaç büyümek değil,
**büyürken dağılmamaktır.**

---

## Yeni kavram

**Operational DNA:**
Bir şirketin nasıl çalıştığını belirleyen ve sistemin içine yazılmış davranış kurallarıdır.

---

## Sürüm Geçmişi

| Sürüm | Tarih | Değişiklik |
|-------|-------|------------|
| v1.0 | 2026-05-05 | İlk taslak — 8 bölüm + karar filtresi |
| v1.1 | 2026-05-05 | §9 İhlal tanımı, §10 Zorunlu çıktı, §11 Tek otorite, SONUÇ + Operational DNA eklendi |
| v1.2 | 2026-05-05 | Ana referans doküman olarak proje içine entegre edildi (V179); KX11 manifesto uyum kuralı bağlandı |

---

Güncelleme: **2026-05-05**
