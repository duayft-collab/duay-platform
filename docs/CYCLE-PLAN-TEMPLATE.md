# PLAN.md — Cycle Şablonu (V179 sonrası)

Her cycle başında bu şablon doldurulur ve cycle dosyasına eklenir.

---

## Cycle Künyesi

- **Cycle:** V### CYCLE-NAME-001
- **Tip:** Feature / Refactor / Bugfix / Doc / Hotfix
- **Tarih:** YYYY-MM-DD
- **T2 Önceki Commit:** `<hash>`

## Amaç

Net 1 cümle.

## Kapsam

3-5 madde.

---

## ⚠️ Manifesto Uyum Kontrolü (V179'dan itibaren ZORUNLU)

> Kaynak: [docs/DUAY_PLATFORM_MANIFEST.md](../docs/DUAY_PLATFORM_MANIFEST.md) §8

| #   | Soru                                            | Cevap (✅ / ❌ + 1 cümle gerekçe)                |
| --- | ----------------------------------------------- | ----------------------------------------------- |
| 1   | Bu gerçek bir problemi çözüyor mu?              |                                                 |
| 2   | İç ekip mi, dış paydaş mı kullanacak?           | İç / Dış / Karma                                |
| 3   | 700 satır sınırı korunuyor mu (KX9)?            | Hedef dosya: `<path>` — `<satır sayısı>`/700    |
| 4   | KX10 ihlali var mı? (Ortak veri tek kaynak)     |                                                 |
| 5   | Test ve rollback planı hazır mı?                | TEST-PLAN.md / ROLLBACK.md                      |
| 6   | RBAC + audit + soft delete tasarımda var mı?    |                                                 |
| 7   | Mockup tam mı (KX7)?                            |                                                 |
| 8   | Tenant-ready mi?                                |                                                 |
| 9   | EDIT planı atomik mi (5 EDIT)?                  | `<edit sayısı>` EDIT                            |

### Sonuç

- **Tüm cevaplar ✅ →** Cycle açılabilir, EDIT'lere geçilir.
- **Bir veya daha fazla ❌ →** Cycle **REDDEDİLİR**. Aşağıya gerekçe yazılır:

> _Reddetme gerekçesi (varsa):_

---

## Anayasa Uyumu

- ✅ K01 — dosya satır kontrolü
- ✅ K02 — RBAC
- ✅ K05 — audit log
- ✅ K06 — soft delete
- ✅ KX5 — saha test zorunlu
- ✅ KX8 — anchor view birebir kopya
- ✅ KX9 — 700+ satır yasağı
- ✅ KX10 — ortak veri tek kaynak
- ✅ **KX11 — manifesto uyumu** (V179 sonrası)

## EDIT Sayısı

5 atomik (Çalışma Kuralları §2).

## Risk Notu

(Varsa: yan etki, regresyon riski, bağımlı modüller.)
