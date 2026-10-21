#!/usr/bin/env bash
# E-01 · Toda ruta publica tiene su propio <title>, y las privadas estan fuera del indice.
#
# Por que sobre HTTP y no sobre el codigo: `generateMetadata` puede existir y aun asi no
# aplicarse. El caso real de este proyecto es una ruta dinamica que descarta su `params` y sirve
# el mismo contenido para todo slug (CLAUDE.md lo documenta como trampa conocida) — eso se ve en
# el HTML servido y NO se ve en el codigo. Mismo criterio que check-adr004.sh.
#
# Uso:  bash scripts/check-seo.sh [base_url]     (default http://localhost:3000)
set -uo pipefail
BASE=${1:-http://localhost:3000}
fail=0

title_of() { curl -s "$BASE$1" | grep -o '<title>[^<]*</title>' | head -1 | sed 's/<[^>]*>//g'; }

echo "== titles unicos por ruta publica =="
seen_titles=""
for p in / /cursos /diario /guias /entrar; do
  t=$(title_of "$p")
  if [ -z "$t" ]; then
    echo "  FALLA  $p — sin <title>"; fail=1; continue
  fi
  if printf '%s\n' "$seen_titles" | grep -Fxq "$t"; then
    echo "  FALLA  $p — comparte <title> con otra ruta: '$t'"; fail=1
  else
    seen_titles=$(printf '%s\n%s' "$seen_titles" "$t"); echo "  ok     $p — '$t'"
  fi
done

echo "== las dinamicas no descartan su param =="
# Dos slugs distintos de la misma ruta tienen que dar titles distintos. Un title compartido
# significa que el `params` se esta ignorando y todo slug sirve el mismo contenido.
check_dinamica() {
  local ruta=$1 a=$2 b=$3
  local ta tb
  ta=$(title_of "$ruta/$a"); tb=$(title_of "$ruta/$b")
  if [ -z "$ta" ] || [ -z "$tb" ]; then
    echo "  aviso  $ruta — sin datos para comparar ($a / $b)"; return
  fi
  if [ "$ta" = "$tb" ]; then
    echo "  FALLA  $ruta — '$a' y '$b' comparten <title>: '$ta'"; fail=1
  else
    echo "  ok     $ruta — '$ta' != '$tb'"
  fi
}
# Slugs tomados del sitemap, para no hardcodear el seed.
# Sin `mapfile`: el bash de macOS es 3.2 y no lo tiene.
slugs_de() { curl -s "$BASE/sitemap.xml" | grep -o "<loc>[^<]*$1/[^<]*</loc>" | sed "s|.*$1/||; s|</loc>||" | head -2; }
for ruta in /cursos /guias; do
  a=$(slugs_de "$ruta" | sed -n 1p)
  b=$(slugs_de "$ruta" | sed -n 2p)
  if [ -n "$a" ] && [ -n "$b" ]; then check_dinamica "$ruta" "$a" "$b"
  else echo "  aviso  $ruta — menos de dos publicados, no hay con que comparar"; fi
done

echo "== robots.txt =="
r=$(curl -s "$BASE/robots.txt")
for d in /panel/ /leccion/ /circulo/ /inscribirme/; do
  if grep -q "Disallow: $d" <<<"$r"; then echo "  ok     Disallow $d"
  else echo "  FALLA  falta Disallow $d"; fail=1; fi
done
grep -q "Sitemap:" <<<"$r" && echo "  ok     linea Sitemap" || { echo "  FALLA  sin linea Sitemap"; fail=1; }

echo "== sitemap.xml =="
sm=$(curl -s "$BASE/sitemap.xml")
n=$(grep -c "<loc>" <<<"$sm")
if [ "$n" -ge 4 ]; then echo "  ok     $n URLs"; else echo "  FALLA  solo $n URLs"; fail=1; fi
for d in /panel /leccion /circulo /inscribirme; do
  if grep -q "<loc>[^<]*$d" <<<"$sm"; then
    echo "  FALLA  el sitemap expone $d"; fail=1
  else echo "  ok     sitemap sin $d"; fi
done

echo "== no quedan links muertos (C-02) =="
if grep -rq 'href="#"' "$(dirname "$0")/../src" --include='*.tsx'; then
  echo "  FALLA  hay href=\"#\" en src/"; fail=1
else echo "  ok     sin href=\"#\""; fi

[ "$fail" -eq 0 ] && echo "SEO OK" || echo "SEO CON FALLAS"
exit "$fail"
