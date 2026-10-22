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
for d in /panel/ /leccion/ /circulo/; do
  if grep -q "Disallow: $d" <<<"$r"; then echo "  ok     Disallow $d"
  else echo "  FALLA  falta Disallow $d"; fail=1; fi
done
grep -q "Sitemap:" <<<"$r" && echo "  ok     linea Sitemap" || { echo "  FALLA  sin linea Sitemap"; fail=1; }

echo "== sitemap.xml =="
sm=$(curl -s "$BASE/sitemap.xml")
n=$(grep -c "<loc>" <<<"$sm")
if [ "$n" -ge 4 ]; then echo "  ok     $n URLs"; else echo "  FALLA  solo $n URLs"; fail=1; fi
for d in /panel /leccion /circulo; do
  if grep -q "<loc>[^<]*$d" <<<"$sm"; then
    echo "  FALLA  el sitemap expone $d"; fail=1
  else echo "  ok     sitemap sin $d"; fi
done

echo "== /inscribirme es un redirect permanente (T-043) =="
hdr=$(curl -s -o /dev/null -D - "$BASE/inscribirme/tarot-iniciatico")
if grep -qE "^HTTP/[0-9.]+ 308" <<<"$hdr" && grep -qiE "^location: .*/cursos/tarot-iniciatico" <<<"$hdr"; then
  echo "  ok     308 a /cursos/tarot-iniciatico"
else echo "  FALLA  /inscribirme no redirige 308 a la ficha"; fail=1; fi

echo "== no quedan links muertos (C-02) =="
if grep -rq 'href="#"' "$(dirname "$0")/../src" --include='*.tsx'; then
  echo "  FALLA  hay href=\"#\" en src/"; fail=1
else echo "  ok     sin href=\"#\""; fi

echo "== CSP con nonce por request (S-04) =="
csp_nonce() { curl -sD - -o /dev/null "$BASE$1" | tr -d '\r' | grep -i '^content-security-policy' | grep -o "'nonce-[A-Za-z0-9+/=]*'" | head -1; }
for p in / /cursos /guias /diario /entrar; do
  n1=$(csp_nonce "$p"); n2=$(csp_nonce "$p")
  if [ -z "$n1" ]; then echo "  FALLA  $p sin CSP con nonce"; fail=1
  elif [ "$n1" = "$n2" ]; then echo "  FALLA  $p repite nonce entre requests"; fail=1
  else
    total=$(curl -s "$BASE$p" | grep -o '<script[^>]*>' | grep -c .)
    sin=$(curl -s "$BASE$p" | grep -o '<script[^>]*>' | grep -vc 'nonce="')
    # El nonce del HTML es el de OTRO request: se afirma solo que ningun script sale sin nonce.
    # Cero scripts es una pagina que no se pudo mirar, no una limpia.
    if [ "$total" -eq 0 ]; then echo "  FALLA  $p sin ningun <script> (no se pudo verificar)"; fail=1
    elif [ "$sin" -gt 0 ]; then echo "  FALLA  $p tiene $sin <script> sin nonce"; fail=1
    else echo "  ok     $p nonce distinto por request, $total <script> con nonce"; fi
  fi
done
c=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/csp-report' \
  --data '{"csp-report":{"blocked-uri":"inline","violated-directive":"script-src-elem","document-uri":"http://localhost:3000/check-seo"}}' \
  "$BASE/api/csp-report")
[ "$c" = "204" ] && echo "  ok     endpoint /api/csp-report 204" || { echo "  FALLA  /api/csp-report respondio '$c'"; fail=1; }

echo "== og:image en las publicas (E-02) =="
og_check() {
  local p=$1 url path code
  url=$(curl -s "$BASE$p" | grep -o '<meta property="og:image" content="[^"]*"' | head -1 | sed 's/.*content="//; s/"$//; s/&amp;/\&/g')
  if [ -z "$url" ]; then echo "  FALLA  $p sin og:image"; fail=1; return; fi
  # La URL es absoluta con SITE_URL; se pide el mismo path contra BASE.
  path="/${url#*://*/}"
  code=$(curl -s -o /dev/null -w '%{http_code} %{content_type}' "$BASE$path")
  if [ "$code" = "200 image/png" ]; then echo "  ok     $p -> $path"
  else echo "  FALLA  $p -> $path respondio '$code'"; fail=1; fi
}
for p in / /cursos /guias /diario /entrar; do og_check "$p"; done
for ruta in /cursos /guias /diario; do
  s=$(slugs_de "$ruta" | sed -n 1p)
  if [ -n "$s" ]; then og_check "$ruta/$s"
  # Una base sin publicados es un estado legitimo, pero no es un ok: se dice que no se miro.
  else echo "  aviso  $ruta/<slug> NO VERIFICADO: sin publicados en el sitemap"; fi
done
# Bajo un segmento dinamico la imagen vive en opengraph-image-<hash>: el path pelado da 404 por
# falta de ruta. Se toma la URL real de un curso publicado y se cambia solo el slug.
s=$(slugs_de /cursos | sed -n 1p)
og=$(curl -s "$BASE/cursos/$s" | grep -o '<meta property="og:image" content="[^"]*"' | head -1 | sed 's/.*content="//; s/"$//; s/&amp;/\&/g')
if [ -z "$s" ] || [ -z "$og" ]; then echo "  FALLA  sin curso publicado con og:image para probar el 404"; fail=1
else
  path="/${og#*://*/}"
  ajeno=$(printf '%s' "$path" | sed "s|^/cursos/$s/|/cursos/no-existe-t052/|")
  c=$(curl -s -o /dev/null -w '%{http_code}' "$BASE$ajeno")
  [ "$c" = "404" ] && echo "  ok     OG de curso inexistente 404" || { echo "  FALLA  OG de curso inexistente '$c'"; fail=1; }
fi

echo "== 404 real con pagina propia (c.5) =="
nf=$(curl -s -w '\n%{http_code}' "$BASE/ruta-que-no-existe-t052")
code=$(tail -n1 <<<"$nf")
if [ "$code" != "404" ]; then echo "  FALLA  ruta inexistente respondio '$code'"; fail=1
elif ! grep -q 'name="robots" content="[^"]*noindex' <<<"$nf"; then echo "  FALLA  la 404 no lleva noindex"; fail=1
elif ! grep -q "Este camino no existe" <<<"$nf"; then echo "  FALLA  la 404 no es la pagina propia"; fail=1
else echo "  ok     404 propia con noindex"; fi

[ "$fail" -eq 0 ] && echo "SEO OK" || echo "SEO CON FALLAS"
exit "$fail"
