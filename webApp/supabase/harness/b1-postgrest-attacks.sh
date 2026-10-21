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
