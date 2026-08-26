#!/usr/bin/env bash
# Arranque local: comprueba Node, instala si hace falta y levanta el servidor de desarrollo.
set -euo pipefail
cd "$(dirname "$0")/.."

MINIMO=20
ACTUAL="$(node -v 2>/dev/null | sed 's/^v//' | cut -d. -f1 || echo 0)"
if [ "$ACTUAL" -lt "$MINIMO" ]; then
  echo "Se necesita Node.js $MINIMO o superior (detectado: ${ACTUAL:-ninguno})." >&2
  exit 1
fi

[ -d node_modules ] || { echo "Instalando dependencias…"; npm install; }

echo "Buscador de jurisprudencia (fuente: CENDOJ / CGPJ)"
echo "http://localhost:3000"
exec npm run dev
