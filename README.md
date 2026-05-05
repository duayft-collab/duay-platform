> **Bu proje DUAY Platform Üst Amaç ve Mimari Yön Belgesi'ne göre geliştirilir.** ([docs/DUAY_PLATFORM_MANIFEST.md](docs/DUAY_PLATFORM_MANIFEST.md))
>
> Manifestoya aykırı feature reddedilir, manifestoya aykırı kod commit edilmez (KX11).

# Duay Operasyon Platformu

## Firebase Rules Deploy

```bash
firebase deploy --only firestore:rules
```

Konfigürasyon: `firebase.json` + `.firebaserc`
Mevcut rules: `firestore.rules`

## Pre-commit Hook Setup (PUSULA-018)

İlk klonlamadan sonra her geliştirici çalıştırmalı:

```bash
chmod +x scripts/pre-commit-hook.sh
ln -sf ../../scripts/pre-commit-hook.sh .git/hooks/pre-commit
```

Bundan sonra her `git commit` öncesi otomatik `verify.sh` çalışır.
FAIL → commit iptal.

Detaylar için: `CLAUDE.md`
