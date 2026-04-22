# Git Hooks — Kurulum

Git `.git/hooks/` dizinini clone'da kopyalamaz. Bu nedenle her terminalin ilk kurulumda hook'ları **elle** aktive etmesi gerekir.

## İlk Kurulum (her terminal, tek seferlik)

```bash
cp scripts/pre-commit-template .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

## Aktif Hook'lar

### pre-commit
- **Ne yapar:** Her `git commit` öncesi `scripts/verify.sh` çalıştırır
- **FAIL olursa:** Commit iptal edilir, açıklama yazılır
- **Bypass:** `git commit --no-verify` (son çare; gerekçe commit mesajına yazılır)

## Güncelleme

`scripts/pre-commit-template` güncellendiğinde her terminal tekrar kurulum komutunu çalıştırır.

## Doğrulama

```bash
ls -la .git/hooks/pre-commit     # var ve x-bit set mi?
bash .git/hooks/pre-commit        # manuel test (verify.sh gibi davranmalı)
```
