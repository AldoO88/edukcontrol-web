#!/usr/bin/env bash
# ============================================================
# Regenera los PDFs de los tutoriales de /descargar (uno por
# plataforma) y los deja en public/guias/.
#
#   guia-activacion-android.pdf
#   guia-activacion-ios.pdf
#
# Fuente: las páginas imprimibles /descargar/guia/{android,ios} —
# server render con la MISMA guía que muestra el selector de la
# página principal (botón de tienda, nota de Apple y pasos con
# capturas). Chrome headless imprime cada URL a PDF.
#
# Los PDFs se commitean: si cambia el contenido de la guía (o las
# capturas), vuelve a correr este script y commitea los archivos
# nuevos. Los botones «Descargar tutorial en PDF» de /descargar
# apuntan a esos archivos estáticos.
#
# Uso:
#   ./scripts/generar-tutoriales-pdf.sh
#
# Requiere: node_modules instalados (npm install) y Google Chrome.
# Variables opcionales: PORT (3210) y CHROME (ruta del binario).
# ============================================================
set -euo pipefail

cd "$(dirname "$0")/.."

PORT="${PORT:-3210}"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
OUT_DIR="public/guias"
BASE="http://127.0.0.1:${PORT}"

if [ ! -x "$CHROME" ]; then
  echo "✗ No se encontró Google Chrome en: $CHROME" >&2
  exit 1
fi

echo "› Build de producción…"
npm run build

echo "› Arrancando next start en :${PORT}…"
npx next start -p "$PORT" >/dev/null 2>&1 &
SERVER_PID=$!
# Perfil de Chrome aislado (no pisa una sesión abierta) + apagado del
# servidor al salir, pase lo que pase.
CHROME_PROFILE="$(mktemp -d)"
trap 'kill "$SERVER_PID" 2>/dev/null || true; rm -rf "$CHROME_PROFILE"' EXIT

# Espera a que el servidor responda (máx. 30 s).
ready=0
for _ in $(seq 1 60); do
  if curl -sf "$BASE/descargar/guia/android" >/dev/null; then
    ready=1
    break
  fi
  sleep 0.5
done
if [ "$ready" != "1" ]; then
  echo "✗ El servidor no respondió en $BASE" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

for platform in android ios; do
  out="$PWD/$OUT_DIR/guia-activacion-${platform}.pdf"
  echo "› Generando guia-activacion-${platform}.pdf…"
  "$CHROME" --headless --disable-gpu \
    --user-data-dir="$CHROME_PROFILE" \
    --no-pdf-header-footer \
    --virtual-time-budget=15000 \
    --print-to-pdf="$out" \
    "$BASE/descargar/guia/$platform"
  # Guardia: que el PDF exista y no salga vacío.
  if [ ! -s "$out" ]; then
    echo "✗ PDF vacío o no generado: $out" >&2
    exit 1
  fi
done

echo "✓ Listos en $OUT_DIR/:"
ls -la "$OUT_DIR"
