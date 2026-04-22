#!/usr/bin/env bash
# PROC-RULES-001 — pre-commit verification
# Kontroller: syntax, marker bütünlüğü, duplicate window.X, dangling onclick, innerHTML+=
# Exit: 1 = commit yasak (hard fail), 0 = commit serbest (WARN olabilir)

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || { echo "FAIL(cd): repo root bulunamadı" >&2; exit 1; }

BASELINE_FILE="scripts/.verify-baseline.txt"
if [ ! -f "$BASELINE_FILE" ]; then
  echo "FAIL(baseline): $BASELINE_FILE yok" >&2
  exit 1
fi

BASE_DUP=$(grep -E '^duplicates=' "$BASELINE_FILE" | cut -d= -f2)
BASE_DNG=$(grep -E '^dangling=' "$BASELINE_FILE" | cut -d= -f2)
BASE_IH=$(grep -E '^innerHTML_plus=' "$BASELINE_FILE" | cut -d= -f2)

HARD_FAIL=0
SOFT_WARN=0
REASONS=""

# ── Kontrol 1 — Syntax ─────────────────────────────────────────────
echo "-- Kontrol 1: Syntax"
SYNTAX_ERR=0
while IFS= read -r -d '' f; do
  if ! node --check "$f" 2>/tmp/verify_nodeerr; then
    echo "  SYNTAX FAIL: $f" >&2
    sed -n '1,3p' /tmp/verify_nodeerr >&2
    SYNTAX_ERR=$((SYNTAX_ERR + 1))
  fi
done < <(find src -type f -name "*.js" -print0 2>/dev/null; [ -f sw.js ] && printf 'sw.js\0'; find config -type f -name "*.js" -print0 2>/dev/null)

if [ "$SYNTAX_ERR" -gt 0 ]; then
  HARD_FAIL=1
  REASONS="$REASONS syntax($SYNTAX_ERR)"
fi

# ── Kontrol 2 — Marker bütünlüğü ───────────────────────────────────
echo "-- Kontrol 2: Marker bütünlüğü"
MARKER_MISMATCH=0
# src/ + index.html içinde tüm MARKER-ID'leri topla
MARKERS=$(grep -rhoE '\[[A-Z][A-Z0-9-]+-[0-9]+[A-Z]?\] (START|END)' src/ index.html 2>/dev/null | sort -u)
# Her unique marker-id için START/END sayıları eşit mi
for id in $(echo "$MARKERS" | grep -oE '\[[A-Z][A-Z0-9-]+-[0-9]+[A-Z]?\]' | sort -u); do
  safe_id=$(echo "$id" | sed 's/[][]/\\&/g')
  s=$(grep -rhE "${safe_id} START" src/ index.html 2>/dev/null | wc -l | tr -d ' ')
  e=$(grep -rhE "${safe_id} END" src/ index.html 2>/dev/null | wc -l | tr -d ' ')
  if [ "$s" != "$e" ]; then
    echo "  MARKER MISMATCH: $id START=$s END=$e" >&2
    MARKER_MISMATCH=$((MARKER_MISMATCH + 1))
  fi
done
if [ "$MARKER_MISMATCH" -gt 0 ]; then
  HARD_FAIL=1
  REASONS="$REASONS marker($MARKER_MISMATCH)"
fi

# ── Kontrol 3 — Duplicate window.X ─────────────────────────────────
echo "-- Kontrol 3: Duplicate window.X=function"
DUP_CURR=$(grep -rhE "^window\.[a-zA-Z_][a-zA-Z0-9_]*[[:space:]]*=[[:space:]]*function" src/ 2>/dev/null \
  | sed -E 's/^(window\.[a-zA-Z_][a-zA-Z0-9_]*).*/\1/' \
  | sort | uniq -c | awk '$1>=2' | wc -l | tr -d ' ')
echo "  Duplicate sayısı: $DUP_CURR (baseline: $BASE_DUP)"
if [ "$DUP_CURR" -gt "$BASE_DUP" ]; then
  echo "  FAIL: duplicate baseline'dan kötüleşti ($BASE_DUP → $DUP_CURR)" >&2
  grep -rhE "^window\.[a-zA-Z_][a-zA-Z0-9_]*[[:space:]]*=[[:space:]]*function" src/ 2>/dev/null \
    | sed -E 's/^(window\.[a-zA-Z_][a-zA-Z0-9_]*).*/\1/' \
    | sort | uniq -c | awk '$1>=2 {print "    " $2 " x" $1}' >&2
  HARD_FAIL=1
  REASONS="$REASONS dup($BASE_DUP→$DUP_CURR)"
fi

# ── Kontrol 4 — Dangling onclick handler ───────────────────────────
echo "-- Kontrol 4: Dangling onclick"
TMPDIR_V="/tmp/verify_$$"
mkdir -p "$TMPDIR_V"
grep -rhoE 'onclick="[^"]*"' src/ index.html 2>/dev/null > "$TMPDIR_V/onclicks.txt"

# Fn çağrıları: "foo(" veya "window.foo(" — foo.bar() formu ayrı çıkar
grep -oE '(window\.)?[a-zA-Z_][a-zA-Z0-9_]*\(' "$TMPDIR_V/onclicks.txt" \
  | sed -E 's/^window\.//' | sed 's/($//' | sort -u > "$TMPDIR_V/fn_called_raw.txt"
grep -oE '[a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*\(' "$TMPDIR_V/onclicks.txt" \
  | sed -E 's/^[a-zA-Z_][a-zA-Z0-9_]*\.//' | sed 's/($//' | sort -u > "$TMPDIR_V/ns_methods.txt"

# Ignore list uygula — browser built-in vb. fn_called listesinden çıkar
IGNORE_FILE="scripts/.verify-ignore.txt"
if [ -f "$IGNORE_FILE" ]; then
  grep -vE '^[[:space:]]*(#|$)' "$IGNORE_FILE" > "$TMPDIR_V/ignore.txt"
  if [ -s "$TMPDIR_V/ignore.txt" ]; then
    grep -vxFf "$TMPDIR_V/ignore.txt" "$TMPDIR_V/fn_called_raw.txt" > "$TMPDIR_V/fn_called.txt"
  else
    cp "$TMPDIR_V/fn_called_raw.txt" "$TMPDIR_V/fn_called.txt"
  fi
else
  cp "$TMPDIR_V/fn_called_raw.txt" "$TMPDIR_V/fn_called.txt"
fi

# Tanımlı fn'ler
grep -rhE "function [a-zA-Z_][a-zA-Z0-9_]*|[a-zA-Z_][a-zA-Z0-9_]* = function|window\.[a-zA-Z_][a-zA-Z0-9_]* =|[a-zA-Z_][a-zA-Z0-9_]*: function" src/ 2>/dev/null \
  | grep -oE "(function |window\.)?[a-zA-Z_][a-zA-Z0-9_]*" | sort -u > "$TMPDIR_V/defined.txt"

# Ek pattern: namespace shorthand "X: (async )?function" ve "X: _fn" (alias)
grep -rhE "^[[:space:]]*[a-zA-Z_][a-zA-Z0-9_]*[[:space:]]*:[[:space:]]*(async[[:space:]]+)?function" src/ 2>/dev/null \
  | sed -E "s/^[[:space:]]*([a-zA-Z_][a-zA-Z0-9_]*)[[:space:]]*:.*/\1/" | sort -u >> "$TMPDIR_V/defined.txt"
grep -rhE "^[[:space:]]*[a-zA-Z_][a-zA-Z0-9_]*[[:space:]]*:[[:space:]]*_?[a-zA-Z_]" src/ 2>/dev/null \
  | grep -vE ":[[:space:]]*(async[[:space:]]+)?function" \
  | sed -E "s/^[[:space:]]*([a-zA-Z_][a-zA-Z0-9_]*)[[:space:]]*:.*/\1/" | sort -u >> "$TMPDIR_V/defined.txt"
sort -u "$TMPDIR_V/defined.txt" -o "$TMPDIR_V/defined.txt"

DNG_CURR=0
while IFS= read -r fn; do
  [ -z "$fn" ] && continue
  if ! grep -qE "^(function )?${fn}$|^window\.${fn}$" "$TMPDIR_V/defined.txt" 2>/dev/null; then
    if ! grep -qE "^${fn}$" "$TMPDIR_V/ns_methods.txt" 2>/dev/null; then
      DNG_CURR=$((DNG_CURR + 1))
    fi
  fi
done < "$TMPDIR_V/fn_called.txt"
rm -rf "$TMPDIR_V"

echo "  Dangling sayısı: $DNG_CURR (baseline: $BASE_DNG)"
if [ "$DNG_CURR" -gt "$BASE_DNG" ]; then
  echo "  FAIL: dangling baseline'dan kötüleşti ($BASE_DNG → $DNG_CURR)" >&2
  HARD_FAIL=1
  REASONS="$REASONS dangling($BASE_DNG→$DNG_CURR)"
fi

# ── Kontrol 5 — innerHTML += ───────────────────────────────────────
echo "-- Kontrol 5: innerHTML +="
IH_CURR=$(grep -rhE "innerHTML[[:space:]]*\+=" src/ index.html 2>/dev/null | wc -l | tr -d ' ')
echo "  innerHTML+= sayısı: $IH_CURR (baseline: $BASE_IH)"
if [ "$IH_CURR" -gt "$BASE_IH" ]; then
  echo "  WARN: innerHTML+= arttı ($BASE_IH → $IH_CURR) — D10 ihlali adayı" >&2
  SOFT_WARN=1
  REASONS="$REASONS ih($BASE_IH→$IH_CURR)"
fi

# ── Özet ───────────────────────────────────────────────────────────
echo ""
if [ "$HARD_FAIL" -eq 1 ]; then
  echo "FAIL($(echo "$REASONS" | xargs))"
  exit 1
elif [ "$SOFT_WARN" -eq 1 ]; then
  echo "WARN($(echo "$REASONS" | xargs))"
  exit 0
else
  echo "PASS"
  exit 0
fi
