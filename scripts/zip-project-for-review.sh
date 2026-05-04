#!/usr/bin/env bash
# Архів проєкту для оцінки (без node_modules, dist, .git) — ти нічого не «запускаєш».
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
OUT="allexo-mdf-calculator-for-friend.zip"
rm -f "$OUT"
zip -r "$OUT" . \
  -x "node_modules/*" \
  -x "node_modules/**" \
  -x ".pnpm-store/*" \
  -x ".pnpm-store/**" \
  -x "dist/*" \
  -x "dist/**" \
  -x ".git/*" \
  -x ".git/**" \
  -x "*.zip" \
  -x ".DS_Store"
echo "Готово: $ROOT/$OUT"
