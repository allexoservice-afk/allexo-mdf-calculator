#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if ! command -v npm >/dev/null 2>&1; then
  echo "Потрібен Node.js і npm." >&2
  exit 1
fi
if [[ ! -d node_modules ]]; then
  npm install
fi
npx vite build
(cd dist && zip -r ../allexo-calculator-dist-for-friend.zip .)
echo "Готово: $(pwd)/allexo-calculator-dist-for-friend.zip"
