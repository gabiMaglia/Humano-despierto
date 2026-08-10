-- T-016 · Ningun texto libre del catalogo puede contener un localizador (ADR-003 regla A, ADR-009)
--
-- POR QUE ESTE ARCHIVO EXISTE.
-- ADR-003 cierra `lessons.video_id`, `lesson_resources.drive_file_id` y `.url`: el localizador
-- del contenido pago no se lee ni se escribe desde el cliente. Pero la MISMA fila deja al lado
-- columnas de catalogo —`name`, `size_label`— que son texto libre, las escribe la docente dueña
-- y se leen SIN inscripcion a proposito (son el "que incluye el curso" de T-004 c.4).
-- Reproducido en vivo por el Orquestador contra PostgREST real:
--     PATCH /rest/v1/lesson_resources?id=eq.<propio>
--     {"name":"Manual — drive.google.com/file/d/LEAKED123"}   => HTTP 204, el valor queda
--     has_column_privilege('authenticated','lesson_resources','name','UPDATE') = true
--     has_column_privilege('authenticated','lesson_resources','url' ,'UPDATE') = false
-- El esquema protege la columna `url` y publica el mismo dato en la columna de al lado.
--
-- POR QUE NO ALCANZA LA VALIDACION QUE YA EXISTE.
-- T-005 valida esto con Zod en el Server Action (`src/lib/validation/teacher.ts`). Eso cubre el
-- camino del formulario, no el de PostgREST con el JWT propio de la docente. Es la leccion de
-- ADR-002 otra vez: el limite real es el privilegio, no el codigo de la app. Y como la columna
-- TIENE que ser escribible (la docente nombra sus archivos), el privilegio no puede ser la
-- barrera: la barrera es una restriccion de VALOR, o sea un CHECK.
--
-- POR QUE CHECK Y NO TRIGGER.
-- Los guards de 0005/0006 arbitran un PERMISO y por eso llevan bypass de `is_service_context()`.
-- Esto no arbitra un permiso: mantiene un INVARIANTE de la clase "localizador" (ADR-003), y un
-- invariante con puerta trasera no es un invariante. Un Server Action con service_role tampoco
-- tiene por que escribir un link en `name` — tiene la columna `url` para eso. El CHECK no
-- distingue rol y esa es la propiedad buscada, la misma de `lessons_published_needs_video`.
--
-- ALCANCE (criterio 2: barrido, no la columna reportada).
-- La regla se enuncia sobre la CLASE, no sobre el caso — es el error que ADR-003 documenta dos
-- veces: "un criterio enunciado sobre un caso no cubre la proxima instancia de su clase".
-- La clase es: *toda columna de texto libre que el cliente escribe y que se lee sin inscripcion*.
-- El barrido completo de las 31 columnas de texto del esquema, con su veredicto, esta en ADR-009.

-- ================================================================ el predicado

-- Un solo lugar donde vive el patron. IMMUTABLE porque un CHECK lo exige, y lo es de verdad:
-- no toca ninguna tabla, no depende de `now()` ni de `current_user`.
--
-- Las cuatro reglas, de la mas dura a la mas heuristica:
--   1. `://`  — cualquier esquema (http, https, ftp, magnet). Es el pedido literal del ticket
--      y no tiene falso positivo concebible en el nombre de un archivo.
--   2. `www.` — el link sin esquema que pega quien copia de la barra del navegador.
--   3. host con TLD conocido — atrapa `drive.google.com`, `youtu.be`, `bit.ly`, `t.me`,
--      `dropbox.com`, `mega.nz`. La lista NO es el limite de seguridad (un TLD nuevo la esquiva);
--      es conveniencia sobre las reglas 1 y 2. El guard de cola `([^[:alpha:]]|$)` es lo que
--      salva a "Modulo 1.especial" de matchear `.es`.
--   4. id de Drive suelto — corrida de 25+ de `[A-Za-z0-9_]` con digito Y mayuscula Y minuscula.
--      Las tres condiciones juntas son lo que la hace usable: una palabra no tiene digitos, un
--      titulo no tiene 25 caracteres sin espacio, y `-` queda FUERA del charset a proposito
--      porque si no "Ritual-de-Luna-Nueva-Enero2026" y cualquier slug con mayusculas serian
--      falsos positivos. Un id de Drive con guiones se parte en trozos y el trozo largo igual
--      matchea (medido con ids reales de 28 y 44 caracteres).
--
-- LO QUE NO ATRAPA, a proposito: el id de YouTube suelto son 11 caracteres de `[A-Za-z0-9_-]`,
-- indistinguible de "Introduccion" o "Bibliografia". Cualquier patron que lo atrape rompe los
-- nombres legitimos, que es exactamente como este ticket se revierte. Queda como residuo escrito
-- en ADR-009, no como hueco silencioso.
create or replace function public.text_has_locator(v text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select v ~* '://'
      or v ~* '(^|[^[:alnum:]])www\.'
      or v ~* '[[:alnum:]]\.(com|net|org|io|co|app|dev|edu|gov|info|me|be|ly|gl|nz|cloud|link|site|online|page|xyz|tv)([^[:alpha:]]|$)'
      or exists (
           select 1
           from pg_catalog.regexp_matches(v, '[A-Za-z0-9_]{25,}', 'g') as t(m)
           where t.m[1] ~ '[0-9]' and t.m[1] ~ '[a-z]' and t.m[1] ~ '[A-Z]'
         );
$$;

-- `courses.includes` es text[]: un CHECK no puede llevar subconsulta, asi que el `unnest` se
-- encapsula aca. Mismo predicado, una sola definicion.
create or replace function public.array_has_locator(v text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select exists (select 1 from pg_catalog.unnest(v) as x where public.text_has_locator(x));
$$;

-- ================================================================ las restricciones
--
-- Una por columna, con nombre propio: asi el control de mutacion puede revertir EXACTAMENTE una
-- y demostrar que es esa la que detiene el ataque (estandar de verificacion del proyecto).
-- Columnas NULL-ables: `not f(null)` da null y el CHECK pasa, que es la semantica correcta.

-- ---------------------------------------------------------------- lesson_resources (el defecto)
alter table public.lesson_resources
  add constraint lesson_resources_name_no_locator       check (not public.text_has_locator(name)),
  add constraint lesson_resources_size_label_no_locator check (not public.text_has_locator(size_label));

-- ---------------------------------------------------------------- lessons
-- La fila ES la leccion cuyo `video_id` esconde ADR-003: el localizador republicado aca queda
-- pegado a lo que desbloquea. Es la instancia mas directa de la misma clase.
alter table public.lessons
  add constraint lessons_title_no_locator       check (not public.text_has_locator(title)),
  add constraint lessons_description_no_locator check (not public.text_has_locator(description));

-- ---------------------------------------------------------------- course_modules
alter table public.course_modules
  add constraint course_modules_title_no_locator       check (not public.text_has_locator(title)),
  add constraint course_modules_description_no_locator check (not public.text_has_locator(description));

-- ---------------------------------------------------------------- lesson_chapters
-- La fila es contenido pago (ADR-003 regla B) PERO `lesson_chapters_read_preview` (0004:82) la
-- abre a `anon` cuando la leccion es de vista previa: hay una ventana legible sin inscripcion.
alter table public.lesson_chapters
  add constraint lesson_chapters_label_no_locator check (not public.text_has_locator(label));

-- ---------------------------------------------------------------- courses
-- `includes` es el gemelo semantico exacto de `lesson_resources.name`: el "que incluye el curso"
-- del catalogo, texto libre, escrito por la docente, leido por `anon` sin inscripcion.
alter table public.courses
  add constraint courses_slug_no_locator       check (not public.text_has_locator(slug)),
  add constraint courses_title_no_locator      check (not public.text_has_locator(title)),
  add constraint courses_title_em_no_locator   check (not public.text_has_locator(title_em)),
  add constraint courses_subtitle_no_locator   check (not public.text_has_locator(subtitle)),
  add constraint courses_intro_no_locator      check (not public.text_has_locator(intro)),
  add constraint courses_discipline_no_locator check (not public.text_has_locator(discipline)),
  add constraint courses_level_no_locator      check (not public.text_has_locator(level)),
  add constraint courses_roman_num_no_locator  check (not public.text_has_locator(roman_num)),
  add constraint courses_moon_glyph_no_locator check (not public.text_has_locator(moon_glyph)),
  add constraint courses_includes_no_locator   check (not public.array_has_locator(includes));

-- ---------------------------------------------------------------- profiles
-- La ficha publica de la docente la lee `anon` (`profiles_read_public`, 0004:24) y la escribe
-- ella misma. `bio` es el lugar mas comodo para publicar el link del material.
alter table public.profiles
  add constraint profiles_full_name_no_locator check (not public.text_has_locator(full_name)),
  add constraint profiles_slug_no_locator      check (not public.text_has_locator(slug)),
  add constraint profiles_glyph_no_locator     check (not public.text_has_locator(glyph)),
  add constraint profiles_bio_no_locator       check (not public.text_has_locator(bio));

-- ================================================================ privilegios de ejecucion
--
-- REGLA de 0005:153 — toda migracion que crea funciones termina con este revoke. Postgres otorga
-- EXECUTE a PUBLIC en toda funcion nueva y es un default del CORE.
revoke execute on all functions in schema public from public;

-- Y aca hace falta el grant explicito, por la misma razon que `is_service_context()` (0005:161):
-- la expresion de un CHECK se evalua CON LOS PRIVILEGIOS DEL QUE ESCRIBE. Sin este grant, el
-- UPDATE legitimo de la docente sobre el nombre de su recurso muere con 42501 al evaluar el
-- CHECK — medido, no supuesto (ver el control positivo de la suite).
-- No abre nada: es una funcion pura sobre un texto que el llamador ya tiene en la mano; no lee
-- ninguna tabla, asi que no es oraculo de nada (a diferencia de `lesson_progress_completes`,
-- T-012 H-1, que por leer `lessons` se quedo sin grant).
-- `anon` NO lo recibe: no tiene ningun grant de INSERT ni de UPDATE en el esquema (0003), asi
-- que nunca llega a evaluar un CHECK. Otorgarselo seria superficie sin caso de uso.
grant execute on function public.text_has_locator(text)    to authenticated, service_role;
grant execute on function public.array_has_locator(text[]) to authenticated, service_role;
