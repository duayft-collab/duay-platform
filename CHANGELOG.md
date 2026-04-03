# CHANGELOG — Duay Platform

## [8.3.0] — 2026-04-03

### Eklendi
- IHR-KAYITLI-001: GÇB+7 gün ihraç kayıtlı dilekçe bildirimi + onay akışı
- IHR-AKIS-001: Özet sekmesine görsel iş akışı çizelgesi + dosya sağlığı skoru
- IHR-KDV-001: KDV iade motoru — önceki ay ihracat+gider KDV hesabı
- IHR-ALIM-001: Doğrulamaya alım-ihraç miktar/fiyat karşılaştırması
- IHR-EXCEL-001: Gümrükçü PL preset + İngilizce Excel çıktısı
- IHR-EXCEL-002: Paraşüt muhasebe fatura Excel'i
- IHR-3AY-001: 3 ay ihracat zorunluluk alarmı (60g uyarı, 90g kritik)
- IHR-KAMBIYO-001: 4 ay kambiyo takibi (90g uyarı, 120g kritik, muaf ülkeler)
- IHR-ROL-001: Forwarder/gümrükçü atanmamış alarm
- IHR-KUR-001: GÇB formunda ExchangeRate API otomatik kur çekme
- IHR-ZINCIR-001: Evrak zinciri kilidi PI→CI→PL→GÇB→BL sırası zorunlu
- IHR-HS-001: HS kodu zorunlu — CI/PL/GÇB engeli
- IHR-EVRAK-001: BL ekleme GÇB kontrolü (confirmModal)
- SAT-06: Satınalma aktarımında hs_kodu+kdv_orani+standart_ad taşınması
- ORPHAN-001: Dosya silinince bağlı ürünler otomatik soft-delete
- IHR-10: GÇB kapanmadan alarm (14g uyarı, 30g kritik)
- IHR-06: Kolon gizle/göster + preset şablonlar (CI/PL, GÇB, Sigorta, VGM)
- FORM-AUTO-001: 4 ihracat formu dosya verisinden otomatik dolar (PL/CI/FRQ/IRQ)
- İhracat formları modülü — tarayıcıda DOCX üretimi (docx.js CDN)
- Talimatlar modülü — zamanlı+tetikleyici talimat sistemi
- 52 talimat kaydı alarm modülüne eklendi (6 kategori)
- Nakit akışı işlem toplamları barı + tümünü seç butonu

### Düzeltildi
- SYNC-V3: 1 saatlik gecikme — Firebase Auth token yenileme + permission-denied yeniden bağlanma
- SYNC-V2: Merge sonrası LS yazması LZ uyumlu, verified write echo 2s, doğrulama 400ms
- SYNC-SPEED: onSnapshot throttle 300ms, UI render 100ms, echo penceresi 2s
- Firebase Auth persistence LOCAL — Safari ITP oturum koruması
- SYS-STORAGE-FINAL: LZ-String sıkıştırma + boş alan temizliği (2.8MB → ~0.5MB)
- SYS-STORAGE-ACIL: %100 dolu durumda LZ-String öncesi acil yer açma
- SYS-STORAGE-001: Task file object + trash originalData base64 strip
- IHR-LS-001: Silinen ürün skeleton (444KB → ~140KB)
- ACİL-FIX-004: checkOverdueTasks isDeleted filtresi, banner layout yüksekliği
- ACİL-FIX-005: KPI dönem güncelle auto-KPI bypass, stopPropagation, placeholder dinamik
- İhracat arama+filtre+inline edit menüden atma — _ihrDetayRenderUrunler
- GORUNEN_KOLONLAR.length undefined hatası
- Cache busting v=20260403 serisinde Safari eski versiyon sorunu
- Cari _cariAra + _cariSetSayfa window exportları

### Platform Feature Parity (13/13)
- STANDART-FIX-001: isDeleted migration 6 modül
- STANDART-FIX-002: Toplu silme yetki kontrolü (_yetkiKontrol helper)
- STANDART-FIX-003: Referential integrity — cari silinince satınalma uyarısı
- STANDART-FIX-005: Satış teklif arama genişletme
- STANDART-FIX-006: Cari arama + sayfalama
- STANDART-FIX-007: İhracat ürün sayfalama
- STANDART-FIX-009: Pirim isDeleted + toplu silme + sayfalama
- STANDART-FIX-010: KPI arama + CSV export
- STANDART-FIX-011: Numune sayfalama + toplu güncelleme
- STANDART-FIX-012: Satınalma + kargo toplu güncelleme
- STANDART-FIX-013: Stok sayfalama + toplu silme/güncelleme

### Önceki Sürümler
- PUSULA-V2: Sol/sağ 2 kolon layout, En Önemli 3, kaynaklar bölümü
- PİRİM-V2: Bonus/ceza badge, PDF slip, toplu onay, streak, forecast
- KPI-V2: 6 yeni KPI, alarm eşikleri, dönem karşılaştırma, pirim entegrasyonu
- KARGO-V2: Deniz/hava/kara tabs, alarm, sayfalama, toplu işlem

## [8.0.0] — 2026-03-19
### Eklendi
- Tam modüler mimari: database.js, auth.js, pusula.js, kargo.js, pirim.js, admin.js
- İlk yayın
