#!/bin/bash
# PUSULA-018: Pre-commit verify.sh otomatik tetikleyici
# Setup: ln -sf ../../scripts/pre-commit-hook.sh .git/hooks/pre-commit

set -e

if [ -x scripts/verify.sh ]; then
  bash scripts/verify.sh
  exit $?
fi

echo "[pre-commit] verify.sh bulunamadı, atlanıyor"
exit 0
