#!/usr/bin/env bash
# B-1 · Los ataques de SEC-01 contra PostgREST REAL, por HTTP.
#
# Por qué existe: la suite de `npm test` corre contra PGlite, que es Postgres de
# verdad pero NO ejecuta PostgREST. En el proyecto `fixia` el bug SEC-01 llegó a
# producción por exactamente ese hueco: las policies estaban bien y el grant a
# nivel de tabla las puenteaba por HTTP. Esto cierra ese hueco.
#
# Uso:  npx supabase start  &&  bash supabase/harness/b1-postgrest-attacks.sh
# Sale 0 si TODO ataque fue rechazado y todo camino legítimo funcionó.
set -uo pipefail

API=${API:-http://127.0.0.1:54321}
DBC=${DBC:-supabase_db_webApp}
ANON=${ANON:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0}
SRV=${SRV:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU}
PASS='Passw0rd!123'
fallos=0

q() { docker exec "$DBC" psql -U postgres -d postgres -tAc "$1" 2>/dev/null | head -1; }
x() { docker exec "$DBC" psql -U postgres -d postgres -c "$1" >/dev/null 2>&1; }
tok() {
  curl -s -X POST "$API/auth/v1/token?grant_type=password" -H "apikey: $ANON" \
    -H "Content-Type: application/json" -d "{\"email\":\"$1\",\"password\":\"$PASS\"}" |
    python3 -c "import sys,json;print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null
}
# Usuarios PROPIOS de este script, con prefijo b1-. Nacieron de que el stack local
# es compartido (D-07) y los fixtures de todos rompieron esta suite tres veces: un
# ticket le cambió la contraseña al usuario que usaba, otro le sembró una inscripción,
# y un tercero lo promovió a admin. Un verificador que depende de fixtures ajenos da
# rojos que no son del código, y eso enseña a ignorar los rojos.
alta() {
  curl -s -X POST "$API/auth/v1/signup" -H "apikey: $ANON" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$PASS\"${2:+,\"data\":$2}}" >/dev/null
  # Se reafirman contraseña Y rol: el signup no los pisa si el usuario ya existía.
  x "update auth.users set encrypted_password = crypt('$PASS', gen_salt('bf'))
     where email = '$1';"
  x "update public.profiles set role = '${3:-student}'
     where id = (select id from auth.users where email = '$1');"
}

# Espera un código HTTP concreto. $1 rótulo · $2 esperado · $3 método · $4 path · $5 jwt · $6 body
esperar() {
  local rot=$1 esp=$2 met=$3 path=$4 jwt=$5 body=${6:-}
  local out code
  out=$(curl -s -w $'\n%{http_code}' -X "$met" "$API/rest/v1/$path" \
        -H "apikey: $ANON" -H "Authorization: Bearer $jwt" -H "Content-Type: application/json" \
        ${body:+-d "$body"})
  code=$(tail -1 <<<"$out")
  # Con la anon key como bearer, el gateway responde 401 donde PostgREST daría 403;
  # el cuerpo trae el mismo 42501. Ambos son "denegado", que es lo que se afirma.
  [ "$esp" = "403" ] && [ "$code" = "401" ] && grep -q '42501' <<<"$out" && code=403
  if [ "$code" = "$esp" ]; then
    printf '  ok    %-52s HTTP %s\n' "$rot" "$code"
  else
    printf '  FALLA %-52s HTTP %s (esperaba %s)\n       %s\n' "$rot" "$code" "$esp" "$(sed '$d' <<<"$out" | head -c 160)"
    fallos=$((fallos+1))
  fi
}

echo "── preparando actores y contenido"
alta "b1-alumna@test.local" '{"role":"admin"}' student   # manda role=admin en el signup a propósito
alta "b1-docente@test.local" '' teacher
ALUMNA_JWT=$(tok "b1-alumna@test.local"); DOCENTE_JWT=$(tok "b1-docente@test.local")
[ -z "$ALUMNA_JWT" ] && { echo "no pude autenticar; ¿está levantado el stack?"; exit 2; }
ALUMNA=$(q "select id from auth.users where email='b1-alumna@test.local';")
DOCENTE=$(q "select id from auth.users where email='b1-docente@test.local';")
x "insert into public.courses (slug,title,discipline,level,price_cents,teacher_id,status)
   values ('curso-ajeno','Curso Ajeno','tarot','inicial',10000,'$DOCENTE','published')
   on conflict (slug) do update set teacher_id='$DOCENTE', status='published';"
CURSO=$(q "select id from public.courses where slug='curso-ajeno';")
x "insert into public.course_modules (course_id,position,title) select '$CURSO',1,'Modulo I'
   where not exists (select 1 from public.course_modules where course_id='$CURSO');"
MOD=$(q "select id from public.course_modules where course_id='$CURSO' limit 1;")
x "insert into public.lessons (module_id,course_id,position,title,video_provider,video_id,duration_seconds,is_published)
   select '$MOD','$CURSO',1,'Leccion secreta','youtube','SECRETVIDEO',3138,true
   where not exists (select 1 from public.lessons where module_id='$MOD');"
LEC=$(q "select id from public.lessons where course_id='$CURSO' limit 1;")
x "insert into public.lesson_resources (lesson_id,course_id,position,type,name,drive_file_id,url)
   select '$LEC','$CURSO',1,'pdf','Manual pago','DRIVEID123','https://drive.google.com/file/d/DRIVEID123'
   where not exists (select 1 from public.lesson_resources where lesson_id='$LEC');"
# El nombre se reafirma en cada corrida: los casos T-016 lo reescriben (control positivo) y la
# siembra de arriba no lo pisaria en la segunda pasada (es un `where not exists`).
x "update public.lesson_resources set name='Manual pago', size_label='2.4 MB' where lesson_id='$LEC';"
REC=$(q "select id from public.lesson_resources where lesson_id='$LEC' limit 1;")

echo ""
echo "── el trigger de alta ignora el metadata del cliente (ADR-006)"
ROL=$(q "select role from public.profiles where id='$ALUMNA';")
if [ "$ROL" = "student" ]; then printf '  ok    %-52s role=%s\n' "signup con data.role=admin NO promueve" "$ROL"
else printf '  FALLA %-52s role=%s\n' "signup con data.role=admin promovio!" "$ROL"; fallos=$((fallos+1)); fi

echo ""
echo "── los 3 ataques de SEC-01 (criterio 5 de T-001), por HTTP"
esperar "(a) auto-inscribirse"            403 POST  "enrollments" "$ALUMNA_JWT" "{\"user_id\":\"$ALUMNA\",\"course_id\":\"$CURSO\",\"status\":\"active\"}"
esperar "(b) auto-promoverse a admin"     403 PATCH "profiles?id=eq.$ALUMNA" "$ALUMNA_JWT" '{"role":"admin"}'
esperar "(c) despublicar curso ajeno"     403 PATCH "courses?id=eq.$CURSO"  "$ALUMNA_JWT" '{"status":"draft"}'
esperar "(c2) robar curso ajeno"          403 PATCH "courses?id=eq.$CURSO"  "$ALUMNA_JWT" "{\"teacher_id\":\"$ALUMNA\"}"
esperar "(c3) docente publica curso ajeno" 403 PATCH "courses?id=eq.$CURSO" "$DOCENTE_JWT" '{"featured":true}'

echo ""
echo "── localizadores de contenido pago (ADR-003): solo service_role"
esperar "video_id, alumna sin inscripcion" 403 GET "lessons?select=video_id" "$ALUMNA_JWT"
esperar "select * sobre lessons"           403 GET "lessons?select=*"        "$ALUMNA_JWT"
esperar "drive_file_id+url, autenticada"   403 GET "lesson_resources?select=drive_file_id,url" "$ALUMNA_JWT"
esperar "drive_file_id+url, anon"          403 GET "lesson_resources?select=drive_file_id,url" "$ANON"
esperar "oraculo por filtro (where url)"   403 GET "lesson_resources?url=like.*drive*&select=name" "$ALUMNA_JWT"

echo ""
echo "── T-016 · el localizador republicado en el texto libre del catalogo"
# El ataque NO es de la alumna: es de la DOCENTE DUEÑA, sobre su propia fila. Pasa RLS y pasa el
# grant de columna (`name` tiene que ser escribible, la docente nombra sus archivos). Lo unico
# que lo detiene es el CHECK. Zod (T-005) cubre el formulario, no este camino.
esperar "(d) link en name, docente dueña"   400 PATCH "lesson_resources?id=eq.$REC" "$DOCENTE_JWT" '{"name":"Manual — drive.google.com/file/d/LEAKED123"}'
esperar "(d2) id de Drive suelto en name"   400 PATCH "lesson_resources?id=eq.$REC" "$DOCENTE_JWT" '{"name":"Manual 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"}'
esperar "(d3) link en size_label"           400 PATCH "lesson_resources?id=eq.$REC" "$DOCENTE_JWT" '{"size_label":"https://drive.google.com/file/d/LEAKED123"}'
esperar "(d4) link en el titulo de leccion" 400 PATCH "lessons?id=eq.$LEC"          "$DOCENTE_JWT" '{"title":"Clase completa youtu.be/dQw4w9WgXcQ"}'
esperar "(d5) link en 'que incluye' del curso" 400 PATCH "courses?id=eq.$CURSO"     "$DOCENTE_JWT" '{"includes":["Manual: drive.google.com/file/d/LEAKED123"]}'
esperar "(d6) link en la bio publica"       400 PATCH "profiles?id=eq.$DOCENTE"     "$DOCENTE_JWT" '{"bio":"Material en drive.google.com/drive/folders/LEAKED"}'
# Control positivo, en la misma corrida: un patron goloso rompe el trabajo real de la docente y
# ese es el otro modo de fallar este ticket. Tiene que dar 204.
esperar "(d+) nombre legitimo 'Manual v2.1'" 204 PATCH "lesson_resources?id=eq.$REC" "$DOCENTE_JWT" '{"name":"Manual v2.1","size_label":"2.4 MB"}'
esperar "(d+) 'Bibliografía cap. IV'"        204 PATCH "lesson_resources?id=eq.$REC" "$DOCENTE_JWT" '{"name":"Bibliografía cap. IV"}'
NOM=$(q "select name from public.lesson_resources where id='$REC';")
if [ "$NOM" = "Bibliografía cap. IV" ]; then printf '  ok    %-52s name=%s\n' "en la DB quedo el nombre legitimo, no el link" "$NOM"
else printf '  FALLA %-52s name=%s\n' "el localizador quedo guardado en el catalogo" "$NOM"; fallos=$((fallos+1)); fi

echo ""
echo "── el camino legitimo de service_role POR HTTP (punto ciego que tenia esta suite)"
# Esta seccion existe porque la suite solo afirmaba que los ataques fallan. Un esquema
# que le niega todo a todos pasa los 13 ataques igual de bien que uno correcto. Y de
# hecho pasaba: `service_role` NO tenia privilegio de tabla (medido: 42501 por PostgREST,
# has_table_privilege = false) y ningun Server Action habria funcionado — lo descubrio
# el agente de T-006 al necesitarlo, no esta suite. Lo arregla la migracion 0007.
esperar "service_role lee video_id"        200 GET "lessons?select=id,video_id&limit=1" "$SRV"
esperar "service_role lee lesson_resources" 200 GET "lesson_resources?select=drive_file_id,url&limit=1" "$SRV"
esperar "service_role puede inscribir"     201 POST "enrollments" "$SRV" "{\"user_id\":\"$ALUMNA\",\"course_id\":\"$CURSO\",\"status\":\"active\"}"
x "delete from public.enrollments where user_id='$ALUMNA' and course_id='$CURSO';"

echo ""
echo "── caminos legitimos que NO se deben haber roto"
esperar "catalogo de lecciones (titulos)"  200 GET "lessons?select=title,position" "$ALUMNA_JWT"
esperar "catalogo de recursos (name,type)" 200 GET "lesson_resources?select=name,type" "$ALUMNA_JWT"
esperar "catalogo publico de cursos"       200 GET "courses?select=slug,title" "$ANON"

echo ""
echo "── la verdad en la DB, no lo que contesto la API"
# Se afirma sobre el efecto del ATAQUE, no sobre el estado global de la base: el
# stack es compartido y otros tickets siembran inscripciones legítimas (D-07).
# Contar `enrollments = 0` daba un falso rojo en cuanto alguien sembraba una.
INS=$(q "select count(*) from public.enrollments where user_id='$ALUMNA' and course_id='$CURSO';")
ROL=$(q "select role from public.profiles where id='$ALUMNA';")
EST=$(q "select status from public.courses where id='$CURSO';")
printf '  inscripcion que intento crearse=%s (esperado 0) · rol alumna=%s (student) · curso ajeno=%s (published)\n' "$INS" "$ROL" "$EST"
[ "$INS" = "0" ] && [ "$ROL" = "student" ] && [ "$EST" = "published" ] || { echo "  FALLA: el estado real cambio"; fallos=$((fallos+1)); }

# El curso de ataque queda publicado durante la corrida porque los ataques lo necesitan
# asi, pero publicado aparece en el catalogo real y ensucia lo que ve el PO. Se despublica
# al terminar: un verificador no deja basura en la vista del producto.
x "update public.courses set status='draft' where slug='curso-ajeno';"
# Mismo contrato para lo que toca T-016: el control positivo dejo el recurso renombrado.
x "update public.lesson_resources set name='Manual pago', size_label='2.4 MB' where id='$REC';"

echo ""
if [ "$fallos" -eq 0 ]; then echo "B-1 OK — todo ataque rechazado, todo camino legitimo intacto."; exit 0
else echo "B-1 CON $fallos FALLA(S)."; exit 1; fi
