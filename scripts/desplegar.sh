#!/usr/bin/env bash
# Despliegue a Vercel. Verifica el proyecto y la fuente oficial antes de publicar.
#   ./scripts/desplegar.sh            → preview
#   ./scripts/desplegar.sh produccion → producción
set -euo pipefail
cd "$(dirname "$0")/.."

echo "1/3  Tipos y tests…"
npm run verify

echo "2/3  Auditoría de la fuente oficial…"
if ! npm run audit:cendoj; then
  echo
  echo "La auditoría ha fallado: la integración con CENDOJ puede estar rota." >&2
  read -r -p "¿Desplegar de todos modos? [s/N] " respuesta
  [ "${respuesta:-n}" = "s" ] || exit 1
fi

command -v vercel >/dev/null 2>&1 || { echo "Falta la CLI de Vercel: npm i -g vercel" >&2; exit 1; }

if [ "${1:-preview}" = "produccion" ] || [ "${1:-}" = "prod" ]; then
  echo "3/3  Desplegando a PRODUCCIÓN…"
  exec vercel --prod
fi
echo "3/3  Desplegando preview…"
exec vercel
