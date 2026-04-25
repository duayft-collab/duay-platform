# CLAUDE-KURAL-PI-001 — TAMAMLANDI ✅

**Tarih:** 25 Apr 2026
**Sprint Süresi:** 1 gün
**Etkilenen dosya:** utils.js, satin_alma_v2_pi.js, app_patch.js, satin_alma_v2_satis.js, platform_standartlari.js
**Toplam commit:** 7 (KURAL 1-5+7 + FİX-PI-A-001 + cache v25-v34)

## Kurallar ve Uygulama Durumu

| Kural | Açıklama | Durum |
|-------|----------|-------|
| 1 | Tarih DD MMM YYYY | ✅ AKTİF |
| 2 | Para birimi → tek banka | ✅ AKTİF |
| 3 | PI %100 İngilizce | ✅ AKTİF |
| 4 | Şartlar İngilizce | ✅ AKTİF |
| 5 | Ortak bilgi standardı | ✅ AKTİF |
| 6 | Canlı önizleme | ✅ MEVCUTTU |
| 7 | Hata önleme blok | ✅ AKTİF |
| 8 | Çıkış standardı | ✅ DOĞRULANDI |

## Helper Fonksiyonlar (utils.js)

- `_pdfTarihFormat(d)` — DD MMM YYYY format
- `_pdfBankaListesi(paraBirimi)` — Para birimine göre tek banka
- `_pdfBankaHtmlListe(paraBirimi)` — HTML render (D1+D2)
- `_pdfBankaTekSatir(paraBirimi)` — Tek satır metin
- `_pdfOrtakFooter(stil)` — Kurumsal İngilizce footer
- `_piOnKontrol(t)` — 4 kontrol guard (eksik bilgi/para/TR/AR)

## Kurumsal Bilgiler (PI_ADRES)

- Ünvan: Duay International Trading Ltd.
- Adres: Karadolap District, Neseli St. 1/5, Eyupsultan, Istanbul, TÜRKİYE
- Email: brn.simsek@gmail.com
- Web: www.duaycor.com
- Tel: +90 212 625 5 444

## Kapsam Dışı (Kuyrukta)

- Tüm PI'lara görsel + dinamik satır
- Form Freight/Insurance (CIF/FOB)
- Form üst satır düzeni
- Storage Rules
- PDF Merkezi
- PDF Dosya isim formatı
