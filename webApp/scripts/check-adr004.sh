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

# T-017 · /guias/luz-marini, /guias/mara-iturri, /guias/ines-volpe salen de la lista: eran
# perfiles de `guia.ts` sin ningun curso real en el catalogo de 9 (docentes ficticias que el
# mock nunca alineo con `CATALOG_COURSES`). T-017 sirve /guias desde `profiles` (rol teacher)
# y solo hay 3 docentes reales, las que dictan los 9 cursos: sol-mayor, luna-arce,
# aurora-violeta. Decision y fundamento completos en `supabase/migrations/
# 20260810130000_0011_profile_public_fields.sql` y en el seed.
# T-017 · el id de leccion hardcodeado quedaba viejo cada vez que alguien re-corre el seed:
# `course_modules`/`lessons` de este subarbol se recrean con DELETE + INSERT (gen_random_uuid()
# en cada fila, ver seed.sql) porque el UNIQUE de posicion es DEFERRABLE y no sirve de arbiter
# de ON CONFLICT -- asi que el id de la leccion de vista previa CAMBIA en cada reseed. No es un
# problema de este script en particular: cualquier id hardcodeado en otro lado (test, doc, bookmark)
# tiene el mismo riesgo. Se resuelve el id actual en runtime en vez de hardcodearlo de nuevo.
LECCION_PREVIEW=$(docker exec supabase_db_webApp psql -U postgres -d postgres -tAc \
  "select l.id from public.lessons l join public.courses c on c.id=l.course_id where c.slug='tarot-iniciatico' and l.is_preview=true limit 1;" 2>/dev/null | tr -d '[:space:]')

RUTAS=(/ /cursos /cursos/tarot-iniciatico /cursos/reiki-nivel-1 /cursos/carta-natal-esencial
       /guias /guias/sol-mayor /guias/luna-arce /guias/aurora-violeta
       /diario /circulo /entrar /panel /inscribirme/tarot-iniciatico)
[ -n "$LECCION_PREVIEW" ] && RUTAS+=("/leccion/$LECCION_PREVIEW")

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
#
# OJO, error que QA encontró y que hacía vacuo este guard: filtrar con `grep -v`
# borra la LÍNEA que coincide, y el HTML de Next viene en UNA sola línea — así que
# una página con la excepción se borraba entera y el barrido no veía NADA. /diario
# pasaba en verde con violaciones plantadas. Se sustituye el fragmento, no la línea.
EXCEPCIONES='una carta cada luna nueva|cada luna nueva\.'

fallos=0
echo "ADR-004 · barrido de invariante sobre $BASE"

if [ "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/" 2>/dev/null)" != "200" ]; then
  echo "  El servidor no responde 200 en $BASE"
  echo "  ABORTA: un barrido contra un servidor caído da cero ocurrencias y parece limpio."
  exit 2
fi

# COOKIE opcional: cookie de sesión para escanear las rutas protegidas de verdad.
#   COOKIE="sb-...-auth-token=..." bash scripts/check-adr004.sh
COOKIE=${COOKIE:-}

# Señal de que la PÁGINA renderizó, no solo el cascarón.
#
# CUARTO bypass que encontró QA, y el más sutil: antes se buscaba el nombre del sitio,
# que vive en el <title> del layout raíz — y ese layout se monta IGUAL cuando la página
# falla. Un error boundary con HTTP 200 traía la marca y pasaba como limpio.
# El <h1> lo pone la página, no el layout: medido, las 15 rutas escaneables tienen
# exactamente uno y el error boundary tiene cero.

for r in "${RUTAS[@]}"; do
  # SIN -L a propósito. Segundo agujero por construcción que encontró QA: con -L,
  # /panel, /leccion/* e /inscribirme/* redirigen a /entrar sin sesión y el guard
  # terminaba escaneando el login tres veces, dando verde sobre las rutas que MÁS
  # historial de violaciones tienen. Un redirect ahora se reporta como NO ESCANEADA
  # y cuenta como falla: el guard no puede quedar en verde sobre lo que no miró.
  code=$(curl -s -o /tmp/adr_body -w '%{http_code}' ${COOKIE:+-H "Cookie: $COOKIE"} "$BASE$r")
  # Solo un 200 es escaneable. Antes solo se atajaban los redirects, así que un 404
  # -que monta el mismo layout y por lo tanto pasa cualquier chequeo de contenido-
  # se contaba como ruta limpia. El código de estado es el único discriminador
  # confiable: buscar la cadena "404" no sirve, aparece también en las páginas
  # buenas (nombres de chunk).
  if [ "$code" != "200" ]; then
    if [ "$code" = "307" ] || [ "$code" = "302" ] || [ "$code" = "308" ]; then
      echo "  ? $r — NO ESCANEADA (HTTP $code, exige sesión)"
      echo "      correr con COOKIE=... para escanearla; sin eso no se puede afirmar que esté limpia"
    else
      echo "  ? $r — NO ESCANEADA (HTTP $code: la ruta no sirve una página)"
    fi
    fallos=$((fallos+1)); continue
  fi
  # Tercer agujero por construcción que encontró QA: /leccion/1 no es un UUID, así
  # que con sesión la página reventaba y el guard marcaba ✓ sobre un error boundary.
  # No alcanza con corregir esa ruta: cualquier página de error da cero coincidencias
  # y parece limpia. Se exige una señal de que se escaneó una página REAL — el layout
  # del sitio siempre monta el footer. Sin eso, NO ESCANEADA.
  if ! grep -q "<h1" /tmp/adr_body; then
    echo "  ? $r — NO ESCANEADA (respondió $code pero la página no renderizó:"
    echo "      no hay <h1>, así que es el cascarón del layout — error boundary o similar)"
    fallos=$((fallos+1)); continue
  fi
  html=$(sed -E "s/($EXCEPCIONES)//gI" /tmp/adr_body)
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
