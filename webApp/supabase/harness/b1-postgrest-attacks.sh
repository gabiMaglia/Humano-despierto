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
  # T-040 (D8): con `enable_confirmations = true` el signup deja la cuenta sin confirmar y el
  # login del harness rebota; se confirma acá en vez de abrir el link de Mailpit.
  x "update auth.users set encrypted_password = crypt('$PASS', gen_salt('bf')),
       email_confirmed_at = coalesce(email_confirmed_at, now())
     where email = '$1';"
  x "update public.profiles set role = '${3:-student}'
     where id = (select id from auth.users where email = '$1');"
}

# T-021 · crea un campus_post real por HTTP y devuelve su id (o vacio si fallo). Necesita
# `Prefer: return=representation` porque `esperar` solo mira el status code, y los ataques de
# moderacion/edicion de abajo necesitan un id real sobre el que atacar.
crear_post() {
  local course_json=null jwt=$2 author=$3 body=$4
  [ "$1" != "null" ] && course_json="\"$1\""
  curl -s -X POST "$API/rest/v1/campus_posts" -H "apikey: $ANON" -H "Authorization: Bearer $jwt" \
       -H "Content-Type: application/json" -H "Prefer: return=representation" \
       -d "{\"course_id\":$course_json,\"author_id\":\"$author\",\"body\":\"$body\"}" |
    python3 -c "import sys,json
try:
    d = json.load(sys.stdin)
    print(d[0]['id'] if isinstance(d, list) and d else '')
except Exception:
    print('')" 2>/dev/null
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
  # $7 opcional: SQLSTATE que tiene que venir en el cuerpo. Un 400 por columna inexistente no es
  # un 400 por CHECK, y sin esto los dos se leen igual.
  [ -n "${7:-}" ] && ! grep -q "\"$7\"" <<<"$out" && code="$code sin $7"
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
esperar "oraculo por filtro (where drive_file_id)" 403 GET "lesson_resources?drive_file_id=not.is.null&select=name" "$ALUMNA_JWT"
esperar "oraculo por filtro, anon"                 403 GET "lesson_resources?drive_file_id=not.is.null&select=name" "$ANON"

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

echo ""
echo "── S-05 · el localizador EXACTO en la ficha de venta del curso (T-027)"
# Los (d*) de arriba prueban la mitad de FORMA de ADR-009. Esta es la otra mitad, y es la que
# faltaba entera en `courses` hasta 0023: `SECRETVIDEO` son 11 caracteres sin `://`, sin `www.`
# y sin una corrida de 25+ alfanumericos, asi que `text_has_locator` lo deja pasar POR
# CONSTRUCCION. Lo unico que lo detiene es `courses_locator_guard`, que devuelve 42501 -> 403.
# Antes de 0023 estos cinco daban 204 y el video_id salia a `anon` sin sesion.
esperar "(s5) video_id exacto en intro"        403 PATCH "courses?id=eq.$CURSO" "$DOCENTE_JWT" '{"intro":"Mira esta clase: SECRETVIDEO"}'
esperar "(s5b) video_id exacto en description" 403 PATCH "courses?id=eq.$CURSO" "$DOCENTE_JWT" '{"description":"Adelanto: SECRETVIDEO"}'
esperar "(s5c) video_id exacto en subtitle"    403 PATCH "courses?id=eq.$CURSO" "$DOCENTE_JWT" '{"subtitle":"SECRETVIDEO"}'
esperar "(s5d) video_id en un objetivo"        403 PATCH "courses?id=eq.$CURSO" "$DOCENTE_JWT" '{"learning_objectives":["Ver SECRETVIDEO"]}'
esperar "(s5e) video_id en un requisito"       403 PATCH "courses?id=eq.$CURSO" "$DOCENTE_JWT" '{"prerequisites":["Haber visto SECRETVIDEO"]}'
# Control positivo: sin esto, un guard que rechace TODO tambien daria verde arriba.
esperar "(s5+) ficha legitima"                 204 PATCH "courses?id=eq.$CURSO" "$DOCENTE_JWT" '{"description":"Cada leccion es un video corto.","learning_objectives":["Leer los 22 arcanos"],"prerequisites":["Ninguno"],"language":"es"}'

echo ""
echo "── T-028 · resenas: escribir exige inscripcion activa, y la guia responde pero no manda"
# Actora PROPIA e inscripta: b1-alumna tiene que seguir SIN inscripcion para los ataques de arriba.
alta "b1-resenadora@test.local" '' student
RESENADORA_JWT=$(tok "b1-resenadora@test.local")
RESENADORA=$(q "select id from auth.users where email='b1-resenadora@test.local';")
x "insert into public.enrollments (user_id,course_id,status)
   select '$RESENADORA','$CURSO','active'
   where not exists (select 1 from public.enrollments where user_id='$RESENADORA' and course_id='$CURSO');"
x "update public.enrollments set status='active' where user_id='$RESENADORA' and course_id='$CURSO';"
# Idempotencia: la corrida anterior dejo su resena, y el (r5) es justamente CREARLA.
x "delete from public.course_reviews where user_id='$RESENADORA' and course_id='$CURSO';"
RESENA_DE="course_reviews?user_id=eq.$RESENADORA&course_id=eq.$CURSO"

esperar "(r1) resenar sin inscripcion"         403 POST  "course_reviews" "$ALUMNA_JWT" "{\"course_id\":\"$CURSO\",\"user_id\":\"$ALUMNA\",\"rating\":5}"
esperar "(r2) resenar a nombre de un tercero"  403 POST  "course_reviews" "$ALUMNA_JWT" "{\"course_id\":\"$CURSO\",\"user_id\":\"$DOCENTE\",\"rating\":5}"
# Control positivo: sin el, un RLS que rechace TODO tambien daria verde en (r1)/(r2).
esperar "(r5) resena legitima, inscripta activa" 201 POST "course_reviews" "$RESENADORA_JWT" "{\"course_id\":\"$CURSO\",\"user_id\":\"$RESENADORA\",\"rating\":4,\"body\":\"Muy claro.\"}"
# 23505 -> 409 en PostgREST.
esperar "(r6) resenar dos veces el mismo curso" 409 POST "course_reviews" "$RESENADORA_JWT" "{\"course_id\":\"$CURSO\",\"user_id\":\"$RESENADORA\",\"rating\":1}"
# Editar una ajena: RLS FILTRA la fila, no la rechaza -> 204 con 0 filas. El status no alcanza
# para afirmarlo, asi que se mira la base: el texto tiene que seguir siendo el original.
esperar "(r7) editar la resena ajena (204, 0 filas)" 204 PATCH "$RESENA_DE" "$ALUMNA_JWT" '{"body":"secuestrada"}'
BODY=$(q "select body from public.course_reviews where user_id='$RESENADORA' and course_id='$CURSO';")
if [ "$BODY" = "Muy claro." ]; then printf '  ok    %-52s body intacto\n' "(r7b) la resena ajena no cambio"
else printf '  FALLA %-52s body=%s\n' "(r7b) la resena ajena CAMBIO" "$BODY"; fallos=$((fallos+1)); fi
# ADR-009 mitad exacta: el video_id real del curso. Lo detiene el guard (42501 -> 403), no el CHECK.
esperar "(r8) video_id real en el body"        403 PATCH "$RESENA_DE" "$RESENADORA_JWT" '{"body":"La mejor clase: SECRETVIDEO"}'
# (r3)/(r4)/(r10): columnas SIN grant de cliente. Postgres corta con "permission denied for table"
# (42501) antes de evaluar RLS, y PostgREST mapea el 42501 de un usuario autenticado a 403.
# Ocultar es de service_role; firmar la respuesta es del guard (0026).
esperar "(r3) la guia no oculta resenas"       403 PATCH "course_reviews?course_id=eq.$CURSO" "$DOCENTE_JWT" '{"hidden_at":"2026-01-01T00:00:00Z"}'
esperar "(r4) hidden_reason no existe para el cliente" 403 PATCH "course_reviews?course_id=eq.$CURSO" "$DOCENTE_JWT" '{"hidden_reason":"no me gusto"}'
# Control positivo: la guia dueña responde mandando SOLO el texto.
esperar "(r9) la guia dueña responde"          204 PATCH "$RESENA_DE" "$DOCENTE_JWT" '{"response":"Gracias por contarlo."}'
FIRMA=$(q "select responded_by from public.course_reviews where user_id='$RESENADORA' and course_id='$CURSO';")
if [ "$FIRMA" = "$DOCENTE" ]; then printf '  ok    %-52s responded_by=guia\n' "(r9b) el guard firmo la respuesta"
else printf '  FALLA %-52s responded_by=%s\n' "(r9b) la firma no es de la guia" "$FIRMA"; fallos=$((fallos+1)); fi
esperar "(r10) la guia firma como otra persona" 403 PATCH "$RESENA_DE" "$DOCENTE_JWT" "{\"responded_by\":\"$ALUMNA\"}"
esperar "(r11) la autora borra la respuesta"   403 PATCH "$RESENA_DE" "$RESENADORA_JWT" '{"response":null}'

echo ""
echo "── T-037 · reportes y moderacion (ADR-012 c.8) y D-20"
alta "b1-admin@test.local" '' admin
alta "b1-docente-b@test.local" '' teacher
ADMIN_JWT=$(tok "b1-admin@test.local"); DOCENTE_B_JWT=$(tok "b1-docente-b@test.local")
ADMIN=$(q "select id from auth.users where email='b1-admin@test.local';")
DOCENTE_B=$(q "select id from auth.users where email='b1-docente-b@test.local';")
RESENA=$(q "select id from public.course_reviews where user_id='$RESENADORA' and course_id='$CURSO';")
x "update public.course_reviews set hidden_at=null, hidden_by=null, hidden_reason=null where id='$RESENA';"
x "delete from public.course_review_reports where review_id='$RESENA';"
REP="{\"review_id\":\"$RESENA\""

esperar "(m1) la alumna autora reporta"           403 POST "course_review_reports" "$RESENADORA_JWT" "$REP,\"reporter_id\":\"$RESENADORA\",\"reason\":\"No me gusta\"}"
esperar "(m2) guia de otro curso reporta"         403 POST "course_review_reports" "$DOCENTE_B_JWT"  "$REP,\"reporter_id\":\"$DOCENTE_B\",\"reason\":\"Competencia\"}"
esperar "(m3) reportar a nombre de la duena"      403 POST "course_review_reports" "$DOCENTE_B_JWT"  "$REP,\"reporter_id\":\"$DOCENTE\",\"reason\":\"Suplanto\"}"
esperar "(m4) video_id exacto en el motivo"       403 POST "course_review_reports" "$ADMIN_JWT"      "$REP,\"reporter_id\":\"$ADMIN\",\"reason\":\"Ver SECRETVIDEO\"}"
esperar "(m5) nacer resuelto"                     403 POST "course_review_reports" "$ADMIN_JWT"      "$REP,\"reporter_id\":\"$ADMIN\",\"reason\":\"x\",\"resolution\":\"oculta\",\"resolved_at\":\"2026-01-01T00:00:00Z\"}"
# Control positivo: sin el, una policy que rechace todo daria verde arriba.
esperar "(m6) la guia duena reporta"              201 POST "course_review_reports" "$DOCENTE_JWT"    "$REP,\"reporter_id\":\"$DOCENTE\",\"reason\":\"Expone a una tercera persona.\"}"
esperar "(m7) reportar dos veces"                 409 POST "course_review_reports" "$DOCENTE_JWT"    "$REP,\"reporter_id\":\"$DOCENTE\",\"reason\":\"Otra vez\"}"
esperar "(m8) resolverse el reporte (PATCH)"      403 PATCH "course_review_reports?review_id=eq.$RESENA" "$DOCENTE_JWT" '{"resolution":"desestimada"}'
esperar "(m9) leer quien resolvio"                403 GET  "course_review_reports?select=resolved_by" "$DOCENTE_JWT"
# La alumna recibe 200 con cero filas: RLS filtra, no rechaza. Se afirma el cuerpo.
LEE=$(curl -s "$API/rest/v1/course_review_reports?select=id" -H "apikey: $ANON" -H "Authorization: Bearer $RESENADORA_JWT")
if [ "$LEE" = "[]" ]; then printf '  ok    %-52s %s\n' "(m10) la autora no ve que la reportaron" "[]"
else printf '  FALLA %-52s %s\n' "(m10) la autora VE reportes" "$LEE"; fallos=$((fallos+1)); fi
HIDE="{\"p_review_id\":\"$RESENA\",\"p_admin_id\":\"$ADMIN\",\"p_reason\":\"Datos de terceros\"}"
esperar "(m11) la guia oculta por rpc"            403 POST "rpc/moderate_hide_review" "$DOCENTE_JWT" "$HIDE"
esperar "(m12) el admin con su JWT oculta por rpc" 403 POST "rpc/moderate_hide_review" "$ADMIN_JWT"  "$HIDE"
# Camino legitimo: el Server Action, que usa service_role despues de requireAdmin.
esperar "(m13) service_role oculta"               200 POST "rpc/moderate_hide_review" "$SRV" "$HIDE"
VIS=$(curl -s "$API/rest/v1/course_reviews?id=eq.$RESENA&select=id" -H "apikey: $ANON" -H "Authorization: Bearer $ANON")
RES=$(q "select resolution from public.course_review_reports where review_id='$RESENA' and reporter_id='$DOCENTE';")
if [ "$VIS" = "[]" ] && [ "$RES" = "oculta" ]; then printf '  ok    %-52s %s\n' "(m13b) fuera del publico y reporte resuelto" "resolution=$RES"
else printf '  FALLA %-52s vis=%s res=%s\n' "(m13b) oculta a medias" "$VIS" "$RES"; fallos=$((fallos+1)); fi
esperar "(m14) service_role desoculta"            200 POST "rpc/moderate_unhide_review" "$SRV" "{\"p_review_id\":\"$RESENA\",\"p_admin_id\":\"$ADMIN\"}"
# D-20: la guia inscripta en su propio curso.
x "insert into public.enrollments (user_id,course_id,status) values ('$DOCENTE','$CURSO','active')
   on conflict (user_id,course_id) do update set status='active';"
esperar "(m15) D-20 la guia resena su curso"      403 POST "course_reviews" "$DOCENTE_JWT" "{\"course_id\":\"$CURSO\",\"user_id\":\"$DOCENTE\",\"rating\":5}"
x "delete from public.enrollments where user_id='$DOCENTE' and course_id='$CURSO';"
# ADR-012 c.7 por HTTP: la autora borra su resena reportada y el reporte se va con ella.
esperar "(m16) la autora borra su resena reportada" 204 DELETE "course_reviews?id=eq.$RESENA" "$RESENADORA_JWT"
QUEDAN=$(q "select count(*) from public.course_review_reports where review_id='$RESENA';")
if [ "$QUEDAN" = "0" ]; then printf '  ok    %-52s %s\n' "(m16b) el reporte murio con la resena" "0"
else printf '  FALLA %-52s %s\n' "(m16b) reporte huerfano" "$QUEDAN"; fallos=$((fallos+1)); fi

echo ""
echo "── T-035 · el localizador EXACTO en el resto del catalogo (ADR-010)"
# Los (s5*) cubren `courses`. Estos cubren las tablas que quedaron afuera hasta 0025, y por las
# que `SECRETVIDEO` salia a `anon` SIN SESION. `lessons.title` es el peor de todos: se MUESTRA en
# el acordeon de curriculum, asi que no hacia falta ni consultar la API para leerlo.
esperar "(t35a) video_id en el titulo de leccion"  403 PATCH "lessons?id=eq.$LEC"          "$DOCENTE_JWT" '{"title":"Clase SECRETVIDEO"}'
esperar "(t35b) video_id en la descripcion"        403 PATCH "lessons?id=eq.$LEC"          "$DOCENTE_JWT" '{"description":"Ver SECRETVIDEO"}'
esperar "(t35c) video_id en el titulo de modulo"   403 PATCH "course_modules?id=eq.$MOD"   "$DOCENTE_JWT" '{"title":"Modulo SECRETVIDEO"}'
esperar "(t35d) video_id en el nombre del recurso" 403 PATCH "lesson_resources?id=eq.$REC" "$DOCENTE_JWT" '{"name":"Manual SECRETVIDEO"}'
esperar "(t35e) video_id en la bio publica"        403 PATCH "profiles?id=eq.$DOCENTE"     "$DOCENTE_JWT" '{"bio":"Mi clase SECRETVIDEO"}'
# Las cinco columnas de `courses` que 0023 habia dejado afuera y 0025 cerro.
esperar "(t35f) video_id en la disciplina"         403 PATCH "courses?id=eq.$CURSO"        "$DOCENTE_JWT" '{"discipline":"SECRETVIDEO"}'
esperar "(t35g) video_id en 'que incluye'"         403 PATCH "courses?id=eq.$CURSO"        "$DOCENTE_JWT" '{"includes":["Manual SECRETVIDEO"]}'
# Control positivo: sin esto, un guard que rechace TODO tambien daria verde arriba.
esperar "(t35+) titulo legitimo de leccion"        204 PATCH "lessons?id=eq.$LEC"          "$DOCENTE_JWT" '{"title":"Clase 3 — los arcanos menores"}'
esperar "(t35+) bio legitima"                      204 PATCH "profiles?id=eq.$DOCENTE"     "$DOCENTE_JWT" '{"bio":"Ensenio tarot desde 2019."}'
# Control positivo, en la misma corrida: un patron goloso rompe el trabajo real de la docente y
# ese es el otro modo de fallar este ticket. Tiene que dar 204.
esperar "(d+) nombre legitimo 'Manual v2.1'" 204 PATCH "lesson_resources?id=eq.$REC" "$DOCENTE_JWT" '{"name":"Manual v2.1","size_label":"2.4 MB"}'
esperar "(d+) 'Bibliografía cap. IV'"        204 PATCH "lesson_resources?id=eq.$REC" "$DOCENTE_JWT" '{"name":"Bibliografía cap. IV"}'
NOM=$(q "select name from public.lesson_resources where id='$REC';")
if [ "$NOM" = "Bibliografía cap. IV" ]; then printf '  ok    %-52s name=%s\n' "en la DB quedo el nombre legitimo, no el link" "$NOM"
else printf '  FALLA %-52s name=%s\n' "el localizador quedo guardado en el catalogo" "$NOM"; fallos=$((fallos+1)); fi

echo ""
echo "── T-042 · datos privados del perfil y avatar"
AVATAR_F=aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee
x "update public.profiles set phone='+54 11 4000-0000', birth_date='1985-03-21' where id='$DOCENTE';"
# 403 y no 200 vacio: sin grant de SELECT la columna no existe para el cliente (42501).
esperar "(p1) leer el telefono de la docente"   403 GET   "profiles?id=eq.$DOCENTE&select=phone" "$ALUMNA_JWT"
esperar "(p2) leer fechas de nacimiento, anon"  403 GET   "profiles?select=birth_date" "$ANON"
# 204 es lo esperado: RLS filtra la fila en silencio. Lo que se afirma es la DB, abajo.
esperar "(p3) cambiar el telefono de otra"      204 PATCH "profiles?id=eq.$DOCENTE" "$ALUMNA_JWT" '{"phone":"+54 9 0000-0000"}'
TEL=$(q "select phone from public.profiles where id='$DOCENTE';")
if [ "$TEL" = "+54 11 4000-0000" ]; then printf '  ok    %-52s phone=%s\n' "el telefono de la docente no cambio" "$TEL"
else printf '  FALLA %-52s phone=%s\n' "otra usuaria cambio el telefono" "$TEL"; fallos=$((fallos+1)); fi
esperar "(p4) avatar en carpeta ajena"          403 PATCH "profiles?id=eq.$ALUMNA" "$ALUMNA_JWT" "{\"avatar_path\":\"avatars/$DOCENTE/$AVATAR_F.jpg\"}"
esperar "(p5) my_private_profile como anon"     403 POST  "rpc/my_private_profile" "$ANON" '{}'
esperar "(p+) my_private_profile, la duena"     200 POST  "rpc/my_private_profile" "$DOCENTE_JWT" '{}'
esperar "(p+) avatar en carpeta propia"         204 PATCH "profiles?id=eq.$ALUMNA" "$ALUMNA_JWT" "{\"avatar_path\":\"avatars/$ALUMNA/$AVATAR_F.jpg\"}"
x "update public.profiles set avatar_path=null where id='$ALUMNA';
   update public.profiles set phone=null, birth_date=null where id='$DOCENTE';"

# Storage no corre en PGlite: estas son las UNICAS pruebas de las policies de `storage.objects`.
# Storage responde 400 con statusCode 403 en el cuerpo ante una violacion de RLS; se afirma la
# clase (4xx/2xx), no el codigo exacto, porque el exacto cambia entre versiones de storage-api.
subir() {  # $1 rotulo · $2 clase esperada (2xx|4xx) · $3 path dentro del bucket · $4 jwt
  local code
  code=$(printf '\x89PNG\r\n\x1a\n' | curl -s -o /dev/null -w '%{http_code}' -X POST \
         "$API/storage/v1/object/uploads/$3" -H "apikey: $ANON" -H "Authorization: Bearer $4" \
         -H "Content-Type: image/png" --data-binary @-)
  if [ "${code:0:1}xx" = "$2" ]; then printf '  ok    %-52s HTTP %s\n' "$1" "$code"
  else printf '  FALLA %-52s HTTP %s (esperaba %s)\n' "$1" "$code" "$2"; fallos=$((fallos+1)); fi
}
borrar_avatar() {  # $1 path · $2 jwt -> imprime el HTTP code
  curl -s -o /dev/null -w '%{http_code}' -X DELETE "$API/storage/v1/object/uploads/$1" \
       -H "apikey: $ANON" -H "Authorization: Bearer $2"
}
# Una corrida cortada a la mitad deja el objeto y la siguiente daria 409 en vez de 2xx.
borrar_avatar "avatars/$ALUMNA/$AVATAR_F.png" "$ALUMNA_JWT" >/dev/null
subir "(p6) subir a la carpeta de otra"   4xx "avatars/$DOCENTE/$AVATAR_F.png" "$ALUMNA_JWT"
subir "(p6b) subir fuera de avatars/"     4xx "covers/$AVATAR_F.png"           "$ALUMNA_JWT"
# D-34 (T-047): ninguna sesion sube a `uploads`, ni a su propia carpeta. Por HTTP directo se salteaba
# el tope de 2 MB y los magic bytes que valida el servidor. Sube solo la Server Action, con service_role.
subir "(p6c) la duena sube a su carpeta (D-34)" 4xx "avatars/$ALUMNA/$AVATAR_F.png" "$ALUMNA_JWT"
subir "(p6+) service_role sube a avatars/<uid>" 2xx "avatars/$ALUMNA/$AVATAR_F.png" "$SRV"
COD=$(borrar_avatar "avatars/$ALUMNA/$AVATAR_F.png" "$ALUMNA_JWT")
if [ "$COD" = "200" ]; then printf '  ok    %-52s HTTP %s\n' "(p6+) la duena borra su avatar" "$COD"
else printf '  FALLA %-52s HTTP %s (esperaba 200)\n' "(p6+) la duena borra su avatar" "$COD"; fallos=$((fallos+1)); fi

echo ""
echo "── T-047 · portada de curso (y cierre de D-34 en covers/)"
alta "b1-docente2@test.local" '' teacher
DOCENTE2_JWT=$(tok "b1-docente2@test.local")
PORTADA="covers/$CURSO/$AVATAR_F.png"
OTRO_ID=$(q "select gen_random_uuid();")
# PostgREST: pertenencia por CHECK (400 = 23514) y fila por RLS (204 silencioso, se afirma la DB).
esperar "(k1) cover_path de otro curso"           400 PATCH "courses?id=eq.$CURSO" "$DOCENTE_JWT"  "{\"cover_path\":\"covers/$OTRO_ID/$AVATAR_F.png\"}" 23514
esperar "(k2) docente no duena escribe cover_path" 204 PATCH "courses?id=eq.$CURSO" "$DOCENTE2_JWT" "{\"cover_path\":\"$PORTADA\"}"
esperar "(k3) alumna escribe cover_path"          204 PATCH "courses?id=eq.$CURSO" "$ALUMNA_JWT"   "{\"cover_path\":\"$PORTADA\"}"
COV=$(q "select coalesce(cover_path,'null') from public.courses where id='$CURSO';")
if [ "$COV" = "null" ]; then printf '  ok    %-52s cover_path=%s\n' "nadie ajeno cambio cover_path" "$COV"
else printf '  FALLA %-52s cover_path=%s\n' "un ajeno escribio cover_path" "$COV"; fallos=$((fallos+1)); fi

# Storage. Mismo criterio que (p6): se afirma la clase 2xx/4xx, no el codigo exacto.
borrar_avatar "$PORTADA" "$SRV" >/dev/null   # corrida cortada a la mitad deja el objeto
subir "(k4) docente no duena sube a covers/<curso>"  4xx "$PORTADA" "$DOCENTE2_JWT"
subir "(k5) alumna sube a covers/<curso>"            4xx "$PORTADA" "$ALUMNA_JWT"
subir "(k6) anon sube a covers/<curso>"              4xx "$PORTADA" "$ANON"
subir "(k6b) carpeta que no es uuid"                 4xx "covers/no-es-uuid/$AVATAR_F.png" "$DOCENTE_JWT"
# D-34: ni la duena sube por HTTP directo; sus bytes los valida la action antes de subir.
subir "(k6c) la duena sube a su carpeta (D-34)"      4xx "$PORTADA" "$DOCENTE_JWT"
subir "(k+) service_role sube (la action)"           2xx "$PORTADA" "$SRV"
esperar "(k+) la duena apunta cover_path"            204 PATCH "courses?id=eq.$CURSO" "$DOCENTE_JWT" "{\"cover_path\":\"$PORTADA\"}"

# (k7) Listar: segun la version, storage-api contesta 4xx o `200 []` a quien no tiene SELECT. Lo
# que se afirma es lo que importa: ningun nombre bajo covers/ sale en la respuesta.
listar() {  # $1 rotulo · $2 jwt
  local out; out=$(curl -s -X POST "$API/storage/v1/object/list/uploads" -H "apikey: $ANON" \
    -H "Authorization: Bearer $2" -H "Content-Type: application/json" -d "{\"prefix\":\"covers/$CURSO\"}")
  if grep -q "$AVATAR_F" <<<"$out"; then printf '  FALLA %-52s %s\n' "$1" "$(head -c 120 <<<"$out")"; fallos=$((fallos+1))
  else printf '  ok    %-52s %s\n' "$1" "sin nombres"; fi
}
listar "(k7) anon lista covers/<curso>"              "$ANON"
listar "(k7b) docente no duena lista covers/<curso>" "$DOCENTE2_JWT"
# (k8) Firmar: solo service_role (la ficha) o la duena (el editor). anon y ajenos no.
firmar() {  # $1 rotulo · $2 clase esperada · $3 jwt
  local code; code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/storage/v1/object/sign/uploads/$PORTADA" \
    -H "apikey: $ANON" -H "Authorization: Bearer $3" -H "Content-Type: application/json" -d '{"expiresIn":60}')
  if [ "${code:0:1}xx" = "$2" ]; then printf '  ok    %-52s HTTP %s\n' "$1" "$code"
  else printf '  FALLA %-52s HTTP %s (esperaba %s)\n' "$1" "$code" "$2"; fallos=$((fallos+1)); fi
}
firmar "(k8) anon firma la portada"            4xx "$ANON"
firmar "(k8b) docente no duena firma"          4xx "$DOCENTE2_JWT"
firmar "(k8+) la duena firma la suya"          2xx "$DOCENTE_JWT"
firmar "(k8+) service_role firma (ficha)"      2xx "$SRV"
# (k9) Borrar: el ajeno no; la duena si. Se afirma sobre storage.objects y no sobre el codigo:
# storage-api puede contestar 200 con lista vacia a un DELETE que RLS filtro.
COD=$(borrar_avatar "$PORTADA" "$DOCENTE2_JWT")
EXISTE=$(q "select count(*) from storage.objects where bucket_id='uploads' and name='$PORTADA';")
if [ "$EXISTE" = "1" ]; then printf '  ok    %-52s HTTP %s, objeto intacto\n' "(k9) docente no duena borra la portada" "$COD"
else printf '  FALLA %-52s objeto borrado\n' "(k9) docente no duena borra la portada"; fallos=$((fallos+1)); fi
x "update public.courses set cover_path=null where id='$CURSO';"
COD=$(borrar_avatar "$PORTADA" "$DOCENTE_JWT")
EXISTE=$(q "select count(*) from storage.objects where bucket_id='uploads' and name='$PORTADA';")
if [ "$COD" = "200" ] && [ "$EXISTE" = "0" ]; then printf '  ok    %-52s HTTP %s\n' "(k9+) la duena borra su portada" "$COD"
else printf '  FALLA %-52s HTTP %s, quedan %s (esperaba 200 y 0)\n' "(k9+) la duena borra su portada" "$COD" "$EXISTE"; fallos=$((fallos+1)); fi

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
echo "── T-021 · Campus: hilo de curso e hilo general, contra PostgREST real"
# criterio 1: sin inscripcion, ni un mensaje en el hilo del curso.
esperar "(1) escribir en el hilo de curso SIN inscripcion" 403 POST "campus_posts" "$ALUMNA_JWT" \
  "{\"course_id\":\"$CURSO\",\"author_id\":\"$ALUMNA\",\"body\":\"no deberia poder escribir aca\"}"

# Se habilita el camino legitimo (inscripcion real) para poder atacar moderacion/edicion sobre
# filas de verdad — no alcanza con el 403 de arriba, hace falta un mensaje real para atacarlo.
x "insert into public.enrollments (user_id,course_id,status) values ('$ALUMNA','$CURSO','active')
   on conflict (user_id,course_id) do update set status='active';"

ALUMNA_POST=$(crear_post "$CURSO" "$ALUMNA_JWT" "$ALUMNA" "Pregunta real de una alumna ya inscripta")
DOCENTE_POST=$(crear_post "$CURSO" "$DOCENTE_JWT" "$DOCENTE" "Respuesta de la docente en su propio hilo")
if [ -n "$ALUMNA_POST" ] && [ -n "$DOCENTE_POST" ]; then
  printf '  ok    %-52s alumna=%s docente=%s\n' "POST campus_posts CON inscripcion (control positivo)" "$ALUMNA_POST" "$DOCENTE_POST"
else
  printf '  FALLA %-52s\n' "no se pudo crear el mensaje legitimo del hilo de curso"; fallos=$((fallos+1))
fi

# criterio 5(b): moderar sin ser quien corresponde. La alumna esta inscripta (ve el hilo,
# WITH CHECK/USING la dejan llegar al guard trigger) pero no es la docente dueña ni admin.
esperar "(2) moderar curso ajeno: alumna inscripta borra el mensaje de la docente" 403 \
  PATCH "campus_posts?id=eq.$DOCENTE_POST" "$ALUMNA_JWT" \
  "{\"deleted_at\":\"$(date -u +%FT%TZ)\",\"deleted_by\":\"$ALUMNA\",\"deleted_reason\":\"no me gusta\"}"

# criterio 5(c): editar el mensaje de otra persona.
esperar "(3) editar mensaje de otro: alumna reescribe el cuerpo del mensaje de la docente" 403 \
  PATCH "campus_posts?id=eq.$DOCENTE_POST" "$ALUMNA_JWT" '{"body":"lo reescribo yo"}'

echo ""
echo "── Campus: los caminos legitimos que tienen que seguir funcionando"
esperar "la docente SI modera su propio hilo (soft delete, con motivo)" 204 \
  PATCH "campus_posts?id=eq.$ALUMNA_POST" "$DOCENTE_JWT" \
  "{\"deleted_at\":\"$(date -u +%FT%TZ)\",\"deleted_by\":\"$DOCENTE\",\"deleted_reason\":\"control positivo\"}"
esperar "hard DELETE bloqueado incluso para la docente moderadora" 403 \
  DELETE "campus_posts?id=eq.$DOCENTE_POST" "$DOCENTE_JWT"
esperar "cualquiera con sesion escribe en el hilo general, sin inscripcion a nada" 201 \
  POST "campus_posts" "$ALUMNA_JWT" "{\"course_id\":null,\"author_id\":\"$ALUMNA\",\"body\":\"hola desde el hilo general\"}"

# criterio 5(d): el UPDATE que NO cambia nada. La policy de UPDATE deja alcanzar cualquier fila
# legible a proposito (para devolver 42501 explicito en vez de filtrar la fila en silencio), asi
# que el guard es el unico que decide. La version anterior solo preguntaba si el cuerpo cambiaba:
# un PATCH no-op de un tercero pasaba, y `set_updated_at` dejaba el mensaje ajeno "(editado)".
esperar "(3b) PATCH no-op sobre el mensaje de otro: tampoco" 403 \
  PATCH "campus_posts?id=eq.$DOCENTE_POST" "$ALUMNA_JWT" '{"deleted_reason":null}'

echo ""
echo "── Campus · criterio 4 (ADR-009): el CHECK anti-localizador rige TODOS los hilos"
esperar "(4) link en el hilo de CURSO: rechazado" 400 \
  POST "campus_posts" "$ALUMNA_JWT" \
  "{\"course_id\":\"$CURSO\",\"author_id\":\"$ALUMNA\",\"body\":\"Manual: drive.google.com/file/d/LEAKED123\"}"
esperar "(4b) el MISMO link en el hilo GENERAL: rechazado" 400 \
  POST "campus_posts" "$ALUMNA_JWT" \
  "{\"course_id\":null,\"author_id\":\"$ALUMNA\",\"body\":\"Manual: drive.google.com/file/d/LEAKED123\"}"

# El caso que la version anterior de este bloque NO probaba, y por eso lo dio por bueno: un
# localizador de un curso AJENO, pegado en el hilo del curso propio. La cohorte entera del curso
# propio lo leia sin tener acceso al curso de origen. El test viejo posteaba en el hilo propio y
# esperaba 201: nunca cruzaba dos cursos, asi que confirmaba la fuga en vez de detectarla.
esperar "(4c) localizador ajeno al hilo, en el hilo del curso propio" 400 \
  POST "campus_posts" "$ALUMNA_JWT" \
  "{\"course_id\":\"$CURSO\",\"author_id\":\"$ALUMNA\",\"body\":\"posta el video del otro curso: https://youtu.be/OTHERCOURSEVID (no hace falta pagarlo)\"}"

# Control de mutacion: con el CHECK viejo (condicionado por hilo) el ataque de arriba SI pasa.
# Sin esto, un esquema que rechazara todo por cualquier otro motivo pasaria (4c) igual de bien.
#
# El trap cubre la ventana en la que el esquema esta a proposito debilitado. El script corre con
# `set -uo pipefail` y SIN `-e`, asi que sin esto un Ctrl-C entre el revert y la reposicion dejaba
# la base COMPARTIDA con el CHECK debil y nadie se enteraba. Se limpia apenas se repone.
restaurar_check() {
  docker exec "$DBC" psql -U postgres -q -c \
    "delete from public.campus_posts where body like 'revertido:%';
     alter table public.campus_posts drop constraint if exists campus_posts_body_no_locator;
     alter table public.campus_posts add constraint campus_posts_body_no_locator
       check (not public.text_has_locator(body));" >/dev/null 2>&1
  echo "  !!    interrumpido: CHECK estricto restaurado por el trap" >&2
}
trap restaurar_check INT TERM EXIT

x "alter table public.campus_posts drop constraint campus_posts_body_no_locator;
   alter table public.campus_posts add constraint campus_posts_body_no_locator
     check (course_id is not null or not public.text_has_locator(body));"
esperar "control negativo · con el CHECK viejo (4c) vuelve a pasar" 201 \
  POST "campus_posts" "$ALUMNA_JWT" \
  "{\"course_id\":\"$CURSO\",\"author_id\":\"$ALUMNA\",\"body\":\"revertido: https://youtu.be/OTHERCOURSEVID\"}"

# La fila que acaba de crear el control TIENE que borrarse antes de reponer el CHECK estricto:
# `add constraint` valida las filas existentes, asi que con esa fila viva el ALTER falla, y como
# `x` corre las dos sentencias en una transaccion el DROP se revierte junto con el ADD. Resultado
# la primera vez que escribi esto: el harness terminaba en verde dejando el esquema DEBILITADO,
# con el CHECK viejo puesto. Es el mismo modo de falla que el retro ya registro tres veces —
# un verificador que pasa por construccion. Por eso abajo se AFIRMA que el CHECK volvio.
x "delete from public.campus_posts where body like 'revertido:%';
   alter table public.campus_posts drop constraint campus_posts_body_no_locator;
   alter table public.campus_posts add constraint campus_posts_body_no_locator
     check (not public.text_has_locator(body));"
REPUESTO=$(docker exec "$DBC" psql -U postgres -tAc \
  "select pg_get_constraintdef(oid) from pg_constraint where conname='campus_posts_body_no_locator';")
# La asercion tiene que afirmar QUE ESTA y que es la estricta. La primera version solo buscaba
# la AUSENCIA de la cadena 'course_id IS NOT NULL', asi que daba ok con la constraint borrada
# entera -- exactamente el modo de falla que este bloque existe para no repetir. Lo encontro el
# re-chequeo independiente reproduciendo la logica en aislado con REPUESTO=''.
if [ -z "$REPUESTO" ]; then
  printf '  FALLA %-52s\n       el control de mutacion dejo la constraint BORRADA\n' \
    "reponer el CHECK estricto despues del control"
  fallos=$((fallos+1))
elif ! grep -q 'NOT text_has_locator(body)' <<<"$REPUESTO" || grep -q 'course_id IS NOT NULL' <<<"$REPUESTO"; then
  printf '  FALLA %-52s\n       el CHECK repuesto no es el estricto: %s\n' \
    "reponer el CHECK estricto despues del control" "$REPUESTO"
  fallos=$((fallos+1))
else
  printf '  ok    %-52s %s\n' "CHECK estricto repuesto tras el control" "afirmado, no supuesto"
fi
trap - INT TERM EXIT   # ventana cerrada: el esquema ya volvio a su estado fuerte

# Limpieza del Campus: deja la tabla como la encontro. `x` corre como postgres
# (is_service_context()), asi que el hard delete no lo bloquea el guard trigger.
x "delete from public.campus_posts where author_id in ('$ALUMNA','$DOCENTE');"
x "delete from public.enrollments where user_id='$ALUMNA' and course_id='$CURSO';"

echo ""
echo "── T-040 D-1 · la allow-list de redirects de GoTrue no deja salir a otro host"
# GoTrue normaliza userinfo: con un comodín de puerto, `localhost:1@0x01020304` pasaba la
# allow-list y el link de mail (con su `code`) terminaba en 1.2.3.4. Se mira el Location real.
verify_location() {
  curl -s -o /dev/null -w '%{redirect_url}' --get "$API/auth/v1/verify" \
    --data-urlencode "type=$1" --data-urlencode "token=b1-token-invalido" --data-urlencode "redirect_to=$2"
}
for tipo in signup recovery; do
  for destino in "http://localhost:1@0x01020304/auth/callback" "http://localhost:3000@0x01020304/auth/callback"; do
    LOC=$(verify_location "$tipo" "$destino")
    case "$LOC" in
      http://localhost:3000/*) printf '  ok    %-52s %s\n' "$tipo ${destino%%/auth*} cae en site_url" "${LOC%%#*}" ;;
      *) printf '  FALLA %-52s %s\n' "$tipo ${destino%%/auth*} sale a" "${LOC%%#*}"; fallos=$((fallos+1)) ;;
    esac
  done
done
LOC=$(verify_location recovery "http://localhost:3000/auth/callback?next=%2Fentrar%2Fnueva-clave")
case "$LOC" in
  "http://localhost:3000/auth/callback?next=%2Fentrar%2Fnueva-clave"*) printf '  ok    %-52s\n' "callback exacto con next se respeta" ;;
  *) printf '  FALLA %-52s %s\n' "callback exacto con next no se respeta" "${LOC%%#*}"; fallos=$((fallos+1)) ;;
esac


echo "── T-045 · notas: editar y borrar la nota de OTRA (la RLS filtra en silencio: 200 con [])"
# Una policy UPDATE/DELETE con USING falso no da 403: PostgREST contesta 200 y `[]`. Se afirma
# esa forma exacta (con `Prefer: return=representation`) y despues la verdad en la tabla.
nota_http() {  # $1 rotulo · $2 metodo · $3 id · $4 jwt · $5 filas esperadas · $6 body opcional
  local out code cuerpo n
  out=$(curl -s -w $'\n%{http_code}' -X "$2" "$API/rest/v1/lesson_notes?id=eq.$3" \
        -H "apikey: $ANON" -H "Authorization: Bearer $4" -H "Content-Type: application/json" \
        -H "Prefer: return=representation" ${6:+-d "$6"})
  code=$(tail -1 <<<"$out"); cuerpo=$(sed '$d' <<<"$out")
  n=$(python3 -c "import sys,json;print(len(json.load(sys.stdin)))" <<<"$cuerpo" 2>/dev/null || echo "?")
  if [ "$code" = "200" ] && [ "$n" = "$5" ]; then
    printf '  ok    %-52s HTTP %s, %s fila(s)\n' "$1" "$code" "$n"
  else
    printf '  FALLA %-52s HTTP %s, filas=%s (esperaba 200 y %s)\n       %s\n' "$1" "$code" "$n" "$5" "$(head -c 160 <<<"$cuerpo")"
    fallos=$((fallos+1))
  fi
}
x "delete from public.lesson_notes where body like 'b1-nota:%';
   insert into public.lesson_notes (user_id,course_id,lesson_id,at_seconds,body) values
     ('$DOCENTE','$CURSO','$LEC',10,'b1-nota: de la docente'),
     ('$ALUMNA','$CURSO','$LEC',20,'b1-nota: de la alumna');"
NOTA_AJENA=$(q "select id from public.lesson_notes where body='b1-nota: de la docente';")
NOTA_PROPIA=$(q "select id from public.lesson_notes where body='b1-nota: de la alumna';")
nota_http "(n1) editar la nota ajena"            PATCH  "$NOTA_AJENA"  "$ALUMNA_JWT" 0 '{"body":"secuestrada"}'
nota_http "(n2) borrar la nota ajena"            DELETE "$NOTA_AJENA"  "$ALUMNA_JWT" 0
esperar   "(n3) robar la nota (user_id propio)"  403 PATCH "lesson_notes?id=eq.$NOTA_AJENA" "$ALUMNA_JWT" "{\"user_id\":\"$ALUMNA\"}"
CUERPO_AJENA=$(q "select body || '|' || user_id from public.lesson_notes where id='$NOTA_AJENA';")
if [ "$CUERPO_AJENA" = "b1-nota: de la docente|$DOCENTE" ]; then
  printf '  ok    %-52s %s\n' "la nota ajena sigue intacta en la DB" "afirmado, no supuesto"
else
  printf '  FALLA la nota ajena cambio: %s\n' "$CUERPO_AJENA"; fallos=$((fallos+1))
fi
nota_http "(n4) editar la nota PROPIA (camino legitimo)" PATCH  "$NOTA_PROPIA" "$ALUMNA_JWT" 1 '{"body":"b1-nota: editada"}'
nota_http "(n5) borrar la nota PROPIA (camino legitimo)" DELETE "$NOTA_PROPIA" "$ALUMNA_JWT" 1
x "delete from public.lesson_notes where body like 'b1-nota:%';"

echo ""
echo "── T-043 · inscripcion por solicitud: la alumna pide, no se activa"
# Actora PROPIA: b1-alumna tiene que terminar sin fila en curso-ajeno (lo afirma el bloque final).
alta "b1-solicitante@test.local" '' student
SOLICITANTE_JWT=$(tok "b1-solicitante@test.local")
SOLICITANTE=$(q "select id from auth.users where email='b1-solicitante@test.local';")
x "delete from public.enrollments where user_id='$SOLICITANTE' and course_id='$CURSO';"
x "insert into public.courses (slug,title,discipline,level,price_cents,teacher_id,status)
   values ('curso-borrador-b1','Curso Borrador','tarot','inicial',10000,'$DOCENTE','draft')
   on conflict (slug) do update set teacher_id='$DOCENTE', status='draft';"
BORRADOR=$(q "select id from public.courses where slug='curso-borrador-b1';")
SOLICITUD="enrollments?user_id=eq.$SOLICITANTE&course_id=eq.$CURSO"

# "(a) auto-inscribirse" de arriba (status: active) sigue en 403: status no esta en el grant.
esperar "(e1) pedir a nombre de otra"           403 POST "enrollments" "$ALUMNA_JWT" "{\"user_id\":\"$SOLICITANTE\",\"course_id\":\"$CURSO\"}"
esperar "(e2) pedir un curso en borrador"       403 POST "enrollments" "$ALUMNA_JWT" "{\"user_id\":\"$ALUMNA\",\"course_id\":\"$BORRADOR\"}"
esperar "(e3) pedir firmando como otorgante"    403 POST "enrollments" "$ALUMNA_JWT" "{\"user_id\":\"$ALUMNA\",\"course_id\":\"$CURSO\",\"granted_by\":\"$ALUMNA\"}"
# Control positivo: sin el, un esquema que rechace todo daria verde arriba.
esperar "(e+) solicitud legitima"               201 POST "enrollments" "$SOLICITANTE_JWT" "{\"user_id\":\"$SOLICITANTE\",\"course_id\":\"$CURSO\"}"
EST_SOL=$(q "select status || ':' || (requested_at is not null)::text || ':' || coalesce(granted_by::text,'null') from public.enrollments where user_id='$SOLICITANTE' and course_id='$CURSO';")
if [ "$EST_SOL" = "requested:true:null" ]; then printf '  ok    %-52s %s\n' "(e+b) la fila nacio requested, fechada, sin otorgante" "$EST_SOL"
else printf '  FALLA %-52s %s\n' "(e+b) la solicitud no nacio como debia" "$EST_SOL"; fallos=$((fallos+1)); fi
esperar "(e4) pedir dos veces (23505 -> 409)"   409 POST "enrollments" "$SOLICITANTE_JWT" "{\"user_id\":\"$SOLICITANTE\",\"course_id\":\"$CURSO\"}"
esperar "(e5) pasar la propia a active"         403 PATCH "$SOLICITUD" "$SOLICITANTE_JWT" '{"status":"active"}'
esperar "(e6) con requested no ve video_id"     403 GET "lessons?select=id,video_id" "$SOLICITANTE_JWT"
# El camino legitimo de service_role por HTTP: aprobar con el origen en el filtro, como la action.
AHORA=$(date -u +%Y-%m-%dT%H:%M:%SZ)
esperar "(e+) service_role aprueba"             204 PATCH "$SOLICITUD&status=in.(requested,rejected)" "$SRV" "{\"status\":\"active\",\"decided_at\":\"$AHORA\",\"enrolled_at\":\"$AHORA\"}"
EST_SOL=$(q "select status from public.enrollments where user_id='$SOLICITANTE' and course_id='$CURSO';")
if [ "$EST_SOL" = "active" ]; then printf '  ok    %-52s %s\n' "(e+c) quedo activa" "$EST_SOL"
else printf '  FALLA %-52s %s\n' "(e+c) service_role no pudo aprobar" "$EST_SOL"; fallos=$((fallos+1)); fi
x "delete from public.enrollments where user_id='$SOLICITANTE' and course_id='$CURSO';"
x "delete from public.courses where slug='curso-borrador-b1';"

echo "── T-030 · Q&A por leccion: solo quien cursa, un voto, la docente destaca, nada pago en el texto"
# POST con return=representation y devuelve el id (o vacio). Los ataques de edicion, destacado y
# moderacion necesitan filas reales sobre las que atacar.
crear() {
  curl -s -X POST "$API/rest/v1/$1" -H "apikey: $ANON" -H "Authorization: Bearer $2" \
       -H "Content-Type: application/json" -H "Prefer: return=representation" -d "$3" |
    python3 -c "import sys,json
try:
    d = json.load(sys.stdin)
    print(d[0]['id'] if isinstance(d, list) and d else '')
except Exception:
    print('')" 2>/dev/null
}
afirmar() {  # $1 rotulo · $2 obtenido · $3 esperado
  if [ "$2" = "$3" ]; then printf '  ok    %-52s %s\n' "$1" "$2"
  else printf '  FALLA %-52s obtuve=%s esperaba=%s\n' "$1" "$2" "$3"; fallos=$((fallos+1)); fi
}
# Actoras PROPIAS: b1-alumna tiene que seguir sin inscripcion para (q1) y para el chequeo final.
alta "b1-preguntona@test.local" '' student
alta "b1-curiosa@test.local" '' student
PREG_JWT=$(tok "b1-preguntona@test.local"); CUR_JWT=$(tok "b1-curiosa@test.local")
PREG=$(q "select id from auth.users where email='b1-preguntona@test.local';")
CUR=$(q "select id from auth.users where email='b1-curiosa@test.local';")
for U in "$PREG" "$CUR"; do
  x "insert into public.enrollments (user_id,course_id,status) values ('$U','$CURSO','active')
     on conflict (user_id,course_id) do update set status='active';"
done
# Idempotencia: la corrida anterior pudo dejar filas. `x` es postgres (service): el guard no frena.
x "delete from public.lesson_questions where course_id='$CURSO';"

esperar "(q1) preguntar SIN inscripcion"            403 POST "lesson_questions" "$ALUMNA_JWT" \
  "{\"lesson_id\":\"$LEC\",\"author_id\":\"$ALUMNA\",\"title\":\"No deberia\",\"body\":\"Sin inscripcion\"}"
esperar "(q2) anon lee preguntas"                   403 GET "lesson_questions?select=id,title" "$ANON"
esperar "(q2b) anon lee respuestas"                 403 GET "lesson_answers?select=id,body" "$ANON"
esperar "(q2c) anon lee votos"                      403 GET "lesson_question_votes?select=question_id" "$ANON"
esperar "(q2d) el cliente elige el curso"           403 POST "lesson_questions" "$PREG_JWT" \
  "{\"lesson_id\":\"$LEC\",\"course_id\":\"$CURSO\",\"author_id\":\"$PREG\",\"title\":\"Con curso\",\"body\":\"No tiene grant\"}"

PREGUNTA=$(crear lesson_questions "$PREG_JWT" \
  "{\"lesson_id\":\"$LEC\",\"author_id\":\"$PREG\",\"title\":\"Sobre la leccion\",\"body\":\"No entendi el minuto 12\"}")
if [ -n "$PREGUNTA" ]; then printf '  ok    %-52s %s\n' "(q3) inscripta pregunta (control positivo, 201)" "$PREGUNTA"
else printf '  FALLA %-52s\n' "(q3) la inscripta no pudo preguntar"; fallos=$((fallos+1)); fi
afirmar "(q3b) course_id derivado de la leccion" "$(q "select course_id from public.lesson_questions where id='$PREGUNTA';")" "$CURSO"

esperar "(q4) votar"                                201 POST "lesson_question_votes" "$CUR_JWT" "{\"question_id\":\"$PREGUNTA\",\"user_id\":\"$CUR\"}"
# 23505 -> 409 en PostgREST.
esperar "(q4b) votar dos veces"                     409 POST "lesson_question_votes" "$CUR_JWT" "{\"question_id\":\"$PREGUNTA\",\"user_id\":\"$CUR\"}"
afirmar "(q4c) el contador no cambio" "$(q "select count(*) from public.lesson_question_votes where question_id='$PREGUNTA';")" "1"
# La curiosa VE la fila (USING ancho) y el guard la rechaza: 403 explicito, no 204 con 0 filas.
esperar "(q5) editar la pregunta ajena"             403 PATCH "lesson_questions?id=eq.$PREGUNTA" "$CUR_JWT" '{"title":"Secuestrada"}'
esperar "(q6) mandar is_instructor_answer=true"     403 POST "lesson_answers" "$CUR_JWT" \
  "{\"question_id\":\"$PREGUNTA\",\"author_id\":\"$CUR\",\"body\":\"Soy docente\",\"is_instructor_answer\":true}"

R_ALUMNA=$(crear lesson_answers "$CUR_JWT" "{\"question_id\":\"$PREGUNTA\",\"author_id\":\"$CUR\",\"body\":\"Creo que es por la inversion\"}")
R_DOCENTE=$(crear lesson_answers "$DOCENTE_JWT" "{\"question_id\":\"$PREGUNTA\",\"author_id\":\"$DOCENTE\",\"body\":\"La inversion es una pausa\"}")
if [ -n "$R_ALUMNA" ] && [ -n "$R_DOCENTE" ]; then printf '  ok    %-52s\n' "(q7) alumna y docente responden (control positivo, 201)"
else printf '  FALLA %-52s alumna=%s docente=%s\n' "(q7) no se pudo responder" "$R_ALUMNA" "$R_DOCENTE"; fallos=$((fallos+1)); fi
afirmar "(q7b) is_instructor_answer derivado" \
  "$(q "select string_agg(is_instructor_answer::text, ',' order by created_at) from public.lesson_answers where question_id='$PREGUNTA';")" "false,true"

esperar "(q8) destacar la respuesta de una alumna"  403 PATCH "lesson_answers?id=eq.$R_ALUMNA" "$DOCENTE_JWT" '{"featured_at":"2026-01-01T00:00:00Z"}'
esperar "(q8b) la alumna destaca"                   403 PATCH "lesson_answers?id=eq.$R_DOCENTE" "$CUR_JWT" '{"featured_at":"2026-01-01T00:00:00Z"}'
esperar "(q9) la docente destaca la suya"           204 PATCH "lesson_answers?id=eq.$R_DOCENTE" "$DOCENTE_JWT" '{"featured_at":"2026-01-01T00:00:00Z"}'
afirmar "(q9b) el guard firmo el destacado" "$(q "select featured_by from public.lesson_answers where id='$R_DOCENTE';")" "$DOCENTE"
esperar "(q9c) firmar el destacado a mano"          403 PATCH "lesson_answers?id=eq.$R_DOCENTE" "$DOCENTE_JWT" "{\"featured_by\":\"$CUR\"}"

# ADR-009 mitad exacta: el video_id real del curso lo frena el trigger (42501 -> 403), no el CHECK.
esperar "(q10) video_id real en la pregunta"        403 POST "lesson_questions" "$PREG_JWT" \
  "{\"lesson_id\":\"$LEC\",\"author_id\":\"$PREG\",\"title\":\"Una duda\",\"body\":\"Mira SECRETVIDEO\"}"
esperar "(q10b) video_id real en una respuesta"     403 POST "lesson_answers" "$CUR_JWT" \
  "{\"question_id\":\"$PREGUNTA\",\"author_id\":\"$CUR\",\"body\":\"Esta en SECRETVIDEO\"}"
# Mitad de forma: el CHECK (23514 -> 400).
esperar "(q11) forma de link en la pregunta"        400 POST "lesson_questions" "$PREG_JWT" \
  "{\"lesson_id\":\"$LEC\",\"author_id\":\"$PREG\",\"title\":\"Una duda\",\"body\":\"drive.google.com/file/d/LEAKED123\"}"

esperar "(q12) DELETE fisico, docente duena"        403 DELETE "lesson_questions?id=eq.$PREGUNTA" "$DOCENTE_JWT"
esperar "(q13) course_open_questions, una alumna"   403 POST "rpc/course_open_questions" "$CUR_JWT" "{\"p_course_id\":\"$CURSO\"}"
esperar "(q13b) course_open_questions, la duena"    200 POST "rpc/course_open_questions" "$DOCENTE_JWT" "{\"p_course_id\":\"$CURSO\"}"
esperar "(q14) borrar sin motivo"                   403 PATCH "lesson_questions?id=eq.$PREGUNTA" "$DOCENTE_JWT" \
  "{\"deleted_at\":\"$(date -u +%FT%TZ)\",\"deleted_by\":\"$DOCENTE\",\"deleted_reason\":\"   \"}"
esperar "(q14b) la duena modera con motivo"         204 PATCH "lesson_questions?id=eq.$PREGUNTA" "$DOCENTE_JWT" \
  "{\"deleted_at\":\"$(date -u +%FT%TZ)\",\"deleted_by\":\"$DOCENTE\",\"deleted_reason\":\"control positivo\"}"

# E1 (D-26) · el motivo de moderacion del Campus tambien lo lee toda la cohorte del hilo.
POST_E1=$(crear_post "$CURSO" "$PREG_JWT" "$PREG" "Mensaje para moderar")
esperar "(q15) video_id real en el motivo de Campus"  403 PATCH "campus_posts?id=eq.$POST_E1" "$DOCENTE_JWT" \
  "{\"deleted_at\":\"$(date -u +%FT%TZ)\",\"deleted_by\":\"$DOCENTE\",\"deleted_reason\":\"Copia SECRETVIDEO\"}"
esperar "(q15b) motivo de Campus en prosa"            204 PATCH "campus_posts?id=eq.$POST_E1" "$DOCENTE_JWT" \
  "{\"deleted_at\":\"$(date -u +%FT%TZ)\",\"deleted_by\":\"$DOCENTE\",\"deleted_reason\":\"Repite el video de la clase\"}"

# Limpieza: la tabla y las inscripciones como estaban. Cascada a respuestas y votos.
x "delete from public.lesson_questions where course_id='$CURSO';"
x "delete from public.campus_posts where author_id in ('$PREG','$CUR');"
x "delete from public.enrollments where user_id in ('$PREG','$CUR') and course_id='$CURSO';"
echo ""
echo "── T-031 · anuncios: escribe la duena, publica el servidor, leen las inscriptas, nada pago en el texto"
# Helpers propios (nombres distintos a los de T-030 a proposito: no depender de su orden).
crear_anuncio() {  # $1 jwt · $2 body json -> id o vacio
  curl -s -X POST "$API/rest/v1/course_announcements" -H "apikey: $ANON" -H "Authorization: Bearer $1" \
       -H "Content-Type: application/json" -H "Prefer: return=representation" -d "$2" |
    python3 -c "import sys,json
try:
    d = json.load(sys.stdin)
    print(d[0]['id'] if isinstance(d, list) and d else '')
except Exception:
    print('')" 2>/dev/null
}
# 200 + N filas exactas: RLS que filtra en silencio contesta 200 con [] y eso hay que afirmarlo.
filas_anuncio() {  # $1 rotulo · $2 metodo · $3 path · $4 jwt · $5 filas esperadas · $6 body opcional
  local out code cuerpo n
  out=$(curl -s -w $'\n%{http_code}' -X "$2" "$API/rest/v1/$3" \
        -H "apikey: $ANON" -H "Authorization: Bearer $4" -H "Content-Type: application/json" \
        -H "Prefer: return=representation" ${6:+-d "$6"})
  code=$(tail -1 <<<"$out"); cuerpo=$(sed '$d' <<<"$out")
  n=$(python3 -c "import sys,json;print(len(json.load(sys.stdin)))" <<<"$cuerpo" 2>/dev/null || echo "?")
  if [ "$code" = "200" ] && [ "$n" = "$5" ]; then printf '  ok    %-52s HTTP %s, %s fila(s)\n' "$1" "$code" "$n"
  else printf '  FALLA %-52s HTTP %s, filas=%s (esperaba 200 y %s)\n' "$1" "$code" "$n" "$5"; fallos=$((fallos+1)); fi
}
# Actoras PROPIAS: b1-alumna tiene que seguir sin inscripcion para el chequeo final.
alta "b1-anuncios-inscripta@test.local" '' student
alta "b1-anuncios-ajena@test.local" '' teacher
alta "b1-anuncios-admin@test.local" '' admin
INSC_JWT=$(tok "b1-anuncios-inscripta@test.local"); AJENA_JWT=$(tok "b1-anuncios-ajena@test.local")
ADM_JWT=$(tok "b1-anuncios-admin@test.local")
INSC=$(q "select id from auth.users where email='b1-anuncios-inscripta@test.local';")
AJENA=$(q "select id from auth.users where email='b1-anuncios-ajena@test.local';")
ADM=$(q "select id from auth.users where email='b1-anuncios-admin@test.local';")
x "insert into public.enrollments (user_id,course_id,status) values ('$INSC','$CURSO','active')
   on conflict (user_id,course_id) do update set status='active';"
# Idempotencia. `x` es postgres (service): el guard no frena.
x "delete from public.course_announcements where course_id='$CURSO';"

esperar "(a1) la inscripta crea un anuncio"          403 POST "course_announcements" "$INSC_JWT" \
  "{\"course_id\":\"$CURSO\",\"author_id\":\"$INSC\",\"title\":\"No deberia\",\"body\":\"No soy la docente\"}"
esperar "(a2) docente de otro curso crea"            403 POST "course_announcements" "$AJENA_JWT" \
  "{\"course_id\":\"$CURSO\",\"author_id\":\"$AJENA\",\"title\":\"No deberia\",\"body\":\"No es mi curso\"}"
esperar "(a3) la duena nace publicado (status)"      403 POST "course_announcements" "$DOCENTE_JWT" \
  "{\"course_id\":\"$CURSO\",\"author_id\":\"$DOCENTE\",\"title\":\"Atajo\",\"body\":\"Sin pasar por el servidor\",\"status\":\"published\"}"
esperar "(a4) anon lee anuncios"                     403 GET "course_announcements?select=id,title" "$ANON"

ANUNCIO=$(crear_anuncio "$DOCENTE_JWT" \
  "{\"course_id\":\"$CURSO\",\"author_id\":\"$DOCENTE\",\"title\":\"Clase en vivo\",\"body\":\"El jueves repasamos.\"}")
if [ -n "$ANUNCIO" ]; then printf '  ok    %-52s %s\n' "(a5) la duena crea un borrador (control positivo, 201)" "$ANUNCIO"
else printf '  FALLA %-52s\n' "(a5) la duena no pudo crear el borrador"; fallos=$((fallos+1)); fi

esperar "(a6) la duena manda status=published"       403 PATCH "course_announcements?id=eq.$ANUNCIO" "$DOCENTE_JWT" '{"status":"published"}'
filas_anuncio "(a7) la inscripta no ve el borrador"  GET "course_announcements?id=eq.$ANUNCIO&select=id" "$INSC_JWT" 0
filas_anuncio "(a8) la ajena edita el borrador"      PATCH "course_announcements?id=eq.$ANUNCIO" "$AJENA_JWT" 0 '{"body":"secuestrado"}'
esperar "(a9) video_id real en el body"              403 PATCH "course_announcements?id=eq.$ANUNCIO" "$DOCENTE_JWT" '{"body":"Miren SECRETVIDEO"}'
esperar "(a9b) forma de link en el titulo"           400 PATCH "course_announcements?id=eq.$ANUNCIO" "$DOCENTE_JWT" '{"title":"drive.google.com/file/d/LEAKED123"}'
esperar "(a10) la duena corrige su borrador"         204 PATCH "course_announcements?id=eq.$ANUNCIO" "$DOCENTE_JWT" '{"body":"El jueves repasamos la cruz celta."}'

# Publicar es del servidor: lo que hace el Server Action con service_role, por HTTP con la service key.
esperar "(a11) service_role publica"                 204 PATCH "course_announcements?id=eq.$ANUNCIO&status=eq.draft" "$SRV" '{"status":"published"}'
PUB=$(q "select (published_at is not null)::text from public.course_announcements where id='$ANUNCIO';")
[ "$PUB" = "true" ] && printf '  ok    %-52s\n' "(a11b) published_at lo puso el servidor" \
  || { printf '  FALLA (a11b) published_at=%s\n' "$PUB"; fallos=$((fallos+1)); }
filas_anuncio "(a12) la inscripta lee el publicado"  GET "course_announcements?id=eq.$ANUNCIO&select=id,title" "$INSC_JWT" 1
filas_anuncio "(a12b) b1-alumna sin inscripcion"     GET "course_announcements?id=eq.$ANUNCIO&select=id" "$ALUMNA_JWT" 0
esperar "(a13) la duena edita lo publicado"          403 PATCH "course_announcements?id=eq.$ANUNCIO" "$DOCENTE_JWT" '{"body":"Reescrito"}'
esperar "(a13b) service_role lo despublica"          403 PATCH "course_announcements?id=eq.$ANUNCIO" "$SRV" '{"status":"draft"}'

esperar "(a14) la inscripta lo retira"               403 PATCH "course_announcements?id=eq.$ANUNCIO" "$INSC_JWT" \
  "{\"deleted_at\":\"$(date -u +%FT%TZ)\",\"deleted_by\":\"$INSC\",\"deleted_reason\":\"no me gusta\"}"
esperar "(a15) la duena sin motivo"                  403 PATCH "course_announcements?id=eq.$ANUNCIO" "$DOCENTE_JWT" \
  "{\"deleted_at\":\"$(date -u +%FT%TZ)\",\"deleted_by\":\"$DOCENTE\"}"
esperar "(a16) DELETE fisico, la duena"              403 DELETE "course_announcements?id=eq.$ANUNCIO" "$DOCENTE_JWT"
esperar "(a17) el admin modera con motivo"           204 PATCH "course_announcements?id=eq.$ANUNCIO" "$ADM_JWT" \
  "{\"deleted_at\":\"$(date -u +%FT%TZ)\",\"deleted_by\":\"$ADM\",\"deleted_reason\":\"control positivo\"}"
FIRMA=$(q "select deleted_by from public.course_announcements where id='$ANUNCIO';")
[ "$FIRMA" = "$ADM" ] && printf '  ok    %-52s\n' "(a17b) el retiro quedo firmado por el admin" \
  || { printf '  FALLA (a17b) deleted_by=%s\n' "$FIRMA"; fallos=$((fallos+1)); }
filas_anuncio "(a18) la inscripta ya no lo ve"       GET "course_announcements?id=eq.$ANUNCIO&select=id" "$INSC_JWT" 0

# mail_log sigue cerrado a todo cliente (0019): ni la duena reclama turnos.
esperar "(a19) la duena reclama un turno de mail"    403 POST "rpc/claim_or_reclaim_mail_slot" "$DOCENTE_JWT" \
  "{\"p_recipient_user_id\":\"$DOCENTE\",\"p_mail_type\":\"course_announcement\",\"p_scope_key\":\"$ANUNCIO\"}"

# Limpieza: la tabla y la inscripcion como estaban.
x "delete from public.course_announcements where course_id='$CURSO';"
x "delete from public.enrollments where user_id='$INSC' and course_id='$CURSO';"

echo ""
echo "── T-048 · la docente DUENA del curso no lee progreso ni certificados de sus alumnas por PostgREST"
# Van por service_role tras assertOwnsCourse en el servidor; por HTTP la RLS devuelve 200 con [].
# replica: los guards derivan `completed` y limitan el ritmo; aca solo hace falta que la fila exista.
x "set session_replication_role = replica;
   insert into public.lesson_progress (user_id,course_id,lesson_id,seconds_watched,completed,completed_at)
   values ('$ALUMNA','$CURSO','$LEC',3138,true,now())
   on conflict (user_id,lesson_id) do update set seconds_watched = 3138, completed = true;
   insert into public.enrollments (user_id,course_id,status) values ('$ALUMNA','$CURSO','active')
   on conflict (user_id,course_id) do update set status='active';
   insert into public.certificates (user_id,course_id,student_name,course_title,teacher_name,completed_at)
   select '$ALUMNA','$CURSO','x','x','x',now()
   where not exists (select 1 from public.certificates where user_id='$ALUMNA' and course_id='$CURSO');"
filas_ajenas() {  # $1 rotulo · $2 tabla · $3 filas reales sembradas
  local n
  n=$(curl -s "$API/rest/v1/$2?course_id=eq.$CURSO&select=user_id" -H "apikey: $ANON" -H "Authorization: Bearer $DOCENTE_JWT" |
      python3 -c "import sys,json;print(len(json.load(sys.stdin)))" 2>/dev/null || echo "?")
  if [ "$n" = "0" ] && [ "$3" -ge 1 ]; then printf '  ok    %-52s %s fila(s) visibles, %s existen\n' "$1" "$n" "$3"
  else printf '  FALLA %-52s visibles=%s existentes=%s\n' "$1" "$n" "$3"; fallos=$((fallos+1)); fi
}
filas_ajenas "(t48a) docente duena lee lesson_progress ajeno" lesson_progress "$(q "select count(*) from public.lesson_progress where course_id='$CURSO' and user_id='$ALUMNA';")"
filas_ajenas "(t48b) docente duena lee certificates ajenos"   certificates   "$(q "select count(*) from public.certificates where course_id='$CURSO' and user_id='$ALUMNA';")"
x "set session_replication_role = replica;
   delete from public.certificates where user_id='$ALUMNA' and course_id='$CURSO';
   delete from public.lesson_progress where user_id='$ALUMNA' and course_id='$CURSO';
   delete from public.enrollments where user_id='$ALUMNA' and course_id='$CURSO';"

echo ""
echo "── T-033 · guardados: RLS de duena y curso publicado, por HTTP"
x "delete from public.course_wishlist where user_id in ('$ALUMNA','$SOLICITANTE');
   insert into public.courses (slug,title,discipline,level,price_cents,teacher_id,status)
   values ('curso-borrador-b1w','Curso Borrador W','tarot','inicial',10000,'$DOCENTE','draft')
   on conflict (slug) do update set teacher_id='$DOCENTE', status='draft';"
BORRADOR_W=$(q "select id from public.courses where slug='curso-borrador-b1w';")
esperar "(w1) guardar a nombre de otra"            403 POST "course_wishlist" "$ALUMNA_JWT" "{\"user_id\":\"$SOLICITANTE\",\"course_id\":\"$CURSO\"}"
esperar "(w2) guardar un curso en borrador"        403 POST "course_wishlist" "$ALUMNA_JWT" "{\"user_id\":\"$ALUMNA\",\"course_id\":\"$BORRADOR_W\"}"
esperar "(w3) anon guarda"                         401 POST "course_wishlist" "$ANON" "{\"user_id\":\"$ALUMNA\",\"course_id\":\"$CURSO\"}"
esperar "(w4) anon lee la tabla"                   403 GET  "course_wishlist?select=user_id" "$ANON"
# Control positivo: sin el, un esquema que rechace todo daria verde arriba.
esperar "(w+) guardado legitimo"                   201 POST "course_wishlist" "$SOLICITANTE_JWT" "{\"user_id\":\"$SOLICITANTE\",\"course_id\":\"$CURSO\"}"
esperar "(w5) guardar dos veces (23505 -> 409)"    409 POST "course_wishlist" "$SOLICITANTE_JWT" "{\"user_id\":\"$SOLICITANTE\",\"course_id\":\"$CURSO\"}"
esperar "(w6) no hay UPDATE (robar la fila)"       403 PATCH "course_wishlist?user_id=eq.$SOLICITANTE" "$ALUMNA_JWT" "{\"user_id\":\"$ALUMNA\"}"
# La RLS filtra en silencio: leer y borrar lo ajeno es 200 con [] / 204 sin efecto. Se afirma la forma y la DB.
AJENA=$(curl -s "$API/rest/v1/course_wishlist?user_id=eq.$SOLICITANTE" -H "apikey: $ANON" -H "Authorization: Bearer $ALUMNA_JWT")
if [ "$AJENA" = "[]" ]; then printf '  ok    %-52s %s\n' "(w7) leer la wishlist ajena" "[]"
else printf '  FALLA %-52s %s\n' "(w7) la wishlist ajena se filtro" "$(head -c 120 <<<"$AJENA")"; fallos=$((fallos+1)); fi
esperar "(w8) borrar la ajena (204, sin efecto)"   204 DELETE "course_wishlist?user_id=eq.$SOLICITANTE" "$ALUMNA_JWT"
SIGUE=$(q "select count(*) from public.course_wishlist where user_id='$SOLICITANTE';")
if [ "$SIGUE" = "1" ]; then printf '  ok    %-52s %s\n' "la fila ajena sigue en la DB" "afirmado, no supuesto"
else printf '  FALLA la fila ajena cambio: %s\n' "$SIGUE"; fallos=$((fallos+1)); fi
esperar "(w+) quitar la propia"                    204 DELETE "course_wishlist?user_id=eq.$SOLICITANTE" "$SOLICITANTE_JWT"
x "delete from public.course_wishlist where user_id in ('$ALUMNA','$SOLICITANTE');
   delete from public.courses where slug='curso-borrador-b1w';"

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
