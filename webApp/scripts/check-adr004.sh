#!/usr/bin/env bash
# ADR-004 · Los cursos son 100% on-demand. Ninguna pantalla puede prometer fecha
# de inicio, cohorte ni clase en vivo.
#
# Por qué existe: el ticket T-014 fue rechazado DOS veces por QA. No porque el
# trabajo estuviera mal hecho, sino porque el método estaba mal: se barría con
# `grep` buscando palabras, y el invariante no es una palabra. La primera ronda
# se escapó un filtro "Formato"; la segunda, un `role: "ESTUDIANTE · XII"` —el
# numeral de la cohorte SIN la palabra cohorte, invisible para el grep anterior.
#
# Un invariante que se verifica a mano se rompe cada vez que alguien escribe una
# variante nueva. Este script lo verifica sobre el HTML SERVIDO, que es donde el
# usuario lo lee, y no sobre el código, donde el texto puede estar partido por
# JSX o venir de la base.
#
# Uso:  bash scripts/check-adr004.sh [base_url]     (default http://localhost:3099)
set -uo pipefail
BASE=${1:-http://localhost:3099}

RUTAS=(/ /cursos /cursos/tarot-iniciatico /cursos/reiki-nivel-1 /cursos/carta-natal-esencial
       /guias /guias/sol-mayor /guias/luna-arce /guias/luz-marini /guias/mara-iturri
       /guias/ines-volpe /diario /circulo /entrar /panel /leccion/1 /inscribirme/tarot-iniciatico)

# El invariante, no una lista de lugares. Cada patrón con su motivo.
PATRONES=(
  'cohorte'                      # la palabra, en cualquier forma
  'próxima cohorte'
  'en vivo'
  'sesiones live'
  'por zoom'
  '\blive\b'                     # "live + grabado", "LIVE NATAL"
  'presencial'                   # formato de dictado; ADR-004(a) eliminó la columna
  'próximo · [0-9]'              # "Próximo · 6 may" — fecha de inicio disfrazada
  'luna nueva · [0-9]'           # fecha con ropa simbólica
  'ESTUDIANTE · [IVXLC]+[^A-Za-z]' # "ESTUDIANTE · XII" — el numeral de cohorte, sin la palabra
  'plazas tomadas'               # cupo ⇒ hay una cohorte con cupo
  'próxima en luna'
)

# Excepciones deliberadas, con su justificación. Se listan para que borrarlas sea
# una decisión y no un descuido.
#   "una carta cada luna nueva" → cadencia de un boletín, no fecha de inicio.
EXCEPCIONES='una carta cada luna nueva|cada luna nueva\.'

fallos=0
echo "ADR-004 · barrido de invariante sobre $BASE"

if [ "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/" 2>/dev/null)" != "200" ]; then
  echo "  El servidor no responde 200 en $BASE"
  echo "  ABORTA: un barrido contra un servidor caído da cero ocurrencias y parece limpio."
  exit 2
fi

for r in "${RUTAS[@]}"; do
  html=$(curl -s -L "$BASE$r" | grep -viE "$EXCEPCIONES")
  hit=0
  for p in "${PATRONES[@]}"; do
    n=$(printf '%s' "$html" | grep -ciE "$p")
    if [ "$n" != "0" ]; then
      [ "$hit" = "0" ] && { echo "  ✗ $r"; hit=1; }
      echo "      /$p/ ×$n"
      printf '%s' "$html" | grep -oiE ".{30}$p.{20}" | head -1 | sed 's/^/        …/'
      fallos=$((fallos+1))
    fi
  done
  [ "$hit" = "0" ] && echo "  ✓ $r"
done

echo ""
if [ "$fallos" -eq 0 ]; then echo "ADR-004 OK — ninguna ruta promete fecha, cohorte ni clase en vivo."; exit 0
else echo "ADR-004: $fallos violacion(es)."; exit 1; fi
