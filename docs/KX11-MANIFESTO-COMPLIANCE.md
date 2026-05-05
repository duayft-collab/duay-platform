═══════════════════════════════
KX11 — MANİFESTO UYUMU ZORUNLULUĞU
═══════════════════════════════

Tanım:

Tüm geliştirmeler DUAY Platform Üst Amaç ve Mimari Yön Belgesi'ne
("manifesto" — `docs/DUAY_PLATFORM_MANIFEST.md`) uyumlu olmak zorundadır.

Manifesto sadece bilgi belgesi değil; **geliştirme filtresidir.**

KAPSAM:

- Yeni feature önerileri
- Refactor cycle'ları
- Bugfix cycle'ları
- Belge/dokümantasyon güncellemeleri
- Hotfix'ler dahil

KURALLAR:

1. Her PLAN.md "Manifesto Uyum Kontrolü" başlığı ZORUNLU içerir.
2. Manifesto §8 karar filtresinin 9 sorusu cevaplanmadan EDIT açılmaz.
3. Manifestoya aykırı feature reddedilir (PLAN aşamasında durdurulur).
4. Manifestoya aykırı kod commit edilmez (T2 sanity check kapısı).
5. Tek otorite (§11): Anayasa = geliştirme otoritesi → manifesto ile
   anayasa çakışırsa öncelik **manifestodadır** (çünkü manifesto üst belgedir).

İHLAL DURUMU:

- Manifesto §9 ile uyumlu yaklaşım: kod düzeltilir veya geri alınır.
- İhlal cycle dosyasına kısa not olarak yazılır.
- Tekrarlayan ihlal → KX-violations.log'a eklenir (V180 sonrası).

KAYNAK BELGE:

- docs/DUAY_PLATFORM_MANIFEST.md (v1.2)
- README.md başında resmi referans var (V179 ile eklendi)

ÇIKIŞ NOKTASI:

V179 ANA-DOC-INTEGRATION-001 cycle'ı.

ALTIN KURAL:

"Manifesto okunur, uyulur, uygulanır.
Kuralı manifesto verir; Anayasa onu uygular."

═══════════════════════════════
