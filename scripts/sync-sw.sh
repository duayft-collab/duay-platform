#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════
# scripts/sync-sw.sh — SW PRECACHE_URLS otomatik senkron
# Marker: SW-PRECACHE-AUTOSYNC-001
#
# index.html'deki <script src="src/..."> ve <script src="config/...">
# ve <link rel="stylesheet" href="assets/..."> tag'lerini tarar,
# sw.js içindeki [SW-PRECACHE-AUTOSYNC-001 START] / END marker'ları
# arasını yeniden üretir.
#
# Kullanım:  bash scripts/sync-sw.sh
# ════════════════════════════════════════════════════════════════

set -e

INDEX_HTML="index.html"
SW_FILE="sw.js"
TMP_NEW="/tmp/sw.new"
START_MARKER="// [SW-PRECACHE-AUTOSYNC-001 START]"
END_MARKER="// [SW-PRECACHE-AUTOSYNC-001 END]"

# Pre-flight
[ -f "$INDEX_HTML" ] || { echo "FAIL: $INDEX_HTML bulunamadı" >&2; exit 1; }
[ -f "$SW_FILE" ] || { echo "FAIL: $SW_FILE bulunamadı" >&2; exit 1; }
grep -qF "$START_MARKER" "$SW_FILE" || { echo "FAIL: Marker yok — sw.js'e önce marker bloğu eklenmeli" >&2; exit 1; }
grep -qF "$END_MARKER" "$SW_FILE" || { echo "FAIL: END marker yok — sw.js bozuk" >&2; exit 1; }

# Eski liste sayımı (rapor için)
OLD_COUNT=$(awk "/$(echo "$START_MARKER" | sed 's/[][\\/.*^$]/\\&/g')/,/$(echo "$END_MARKER" | sed 's/[][\\/.*^$]/\\&/g')/" "$SW_FILE" | grep -cE "^\s*'/[^']+',?\s*$" || true)

# Sabit başlangıç girdileri (her zaman ilk sırada)
FIXED_HEAD=$(cat <<'EOF'
/
/index.html
/manifest.json
/assets/css/styles.css
/config/firebase.js
EOF
)

# index.html'den dinamik scan
# - <script src="src/..."> / <script src="config/...">
# - <link rel="stylesheet" href="assets/...">
# CDN/HTTP/HTTPS/data: filtrelenir
# Query string ?v=... soyulur
DYN=$(grep -oE '<(script|link)[^>]+(src|href)="(src/|config/|assets/)[^"]+"' "$INDEX_HTML" \
  | grep -oE '(src|href)="[^"]+"' \
  | sed -E 's/^(src|href)="//; s/"$//; s/\?.*$//' \
  | grep -v -E '^(https?:|//|data:)' \
  | awk '!seen[$0]++' \
  | sed 's|^|/|')

# Birleştir: sabit head önce, sonra dyn (sabit head içinde olanlar dyn'den çıkarılır)
ALL=$(printf '%s\n%s\n' "$FIXED_HEAD" "$DYN" | awk '!seen[$0]++')

NEW_COUNT=$(echo "$ALL" | wc -l | tr -d ' ')

# Marker bloğunun yeni içeriği
{
  echo "$START_MARKER"
  echo "const PRECACHE_URLS = ["
  echo "  // OTOMATIK ÜRETİM — manuel düzenleme yapma. Sync için: bash scripts/sync-sw.sh"
  echo "$ALL" | while IFS= read -r p; do
    [ -n "$p" ] && echo "  '$p',"
  done
  echo "];"
  echo "$END_MARKER"
} > /tmp/sw-block.new

# sw.js'de eski marker bloğunu yeni içerikle değiştir
awk -v start="$START_MARKER" -v end="$END_MARKER" -v block_file="/tmp/sw-block.new" '
  BEGIN { in_block = 0 }
  index($0, start) == 1 {
    in_block = 1
    while ((getline line < block_file) > 0) print line
    close(block_file)
    next
  }
  index($0, end) == 1 {
    in_block = 0
    next
  }
  !in_block { print }
' "$SW_FILE" > "$TMP_NEW"

mv "$TMP_NEW" "$SW_FILE"
rm -f /tmp/sw-block.new

# Rapor
DELTA=$((NEW_COUNT - OLD_COUNT))
echo "[sync-sw] Eski liste: $OLD_COUNT satır"
echo "[sync-sw] Yeni liste: $NEW_COUNT satır"
echo "[sync-sw] Delta: $DELTA"
echo "[sync-sw] sw.js güncellendi"
