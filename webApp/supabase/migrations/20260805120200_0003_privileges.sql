-- T-001 · Privilegios (ADR-002 · anti SEC-01 de `fixia`) — criterios 4 y 5
--
-- POR QUE ESTE ARCHIVO EXISTE.
-- Un proyecto Supabase arranca con
--     alter default privileges in schema public grant all on tables to anon, authenticated, ...;
-- de modo que TODA tabla nueva nace con UPDATE/INSERT/DELETE a nivel de TABLA para el cliente.
-- Mientras ese grant de tabla exista, un `revoke update (col)` NO surte efecto: Postgres ya
-- tiene permiso sobre la relacion entera. Ese fue exactamente SEC-01 en `fixia`.
-- La unica secuencia correcta es: REVOKE en bloque -> GRANT por columna (whitelist).
--
-- Consecuencia de la whitelist: una columna que se agregue mañana NO queda expuesta sola.
-- Hay que sumarla a mano a la lista. Eso es intencional.

-- 1) Cortar la herencia futura. ALTER DEFAULT PRIVILEGES solo neutraliza los defaults fijados
--    por el rol que corre esta migracion (`postgres`); por eso ademas se revoca tabla por tabla.
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;

-- 2) Barrer lo ya otorgado.
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- 3) Re-otorgar por columna, nada mas.

-- ---------------------------------------------------------------- profiles
-- `role` es legible (la UI necesita saber si es docente) pero NO escribible por nadie
-- que no sea service_role. Criterio 5(b).
grant select (id, role, full_name, slug, glyph, bio, created_at)
  on public.profiles to anon, authenticated;
grant update (full_name, slug, glyph, bio)
  on public.profiles to authenticated;
-- sin INSERT: la fila la crea el trigger on_auth_user_created. sin DELETE: cascada de auth.users.

-- ---------------------------------------------------------------- courses
grant select (id, slug, title, title_em, subtitle, intro, discipline, level, price_cents,
              currency, roman_num, moon_glyph, includes, teacher_id, status, featured,
              published_at, created_at, updated_at)
  on public.courses to anon, authenticated;
-- `status`, `featured` y `published_at` quedan fuera de INSERT y de UPDATE: publicar es
-- privilegio de service_role (T-008). Criterio 5(c).
grant insert (slug, title, title_em, subtitle, intro, discipline, level, price_cents,
              currency, roman_num, moon_glyph, includes, teacher_id)
  on public.courses to authenticated;
-- `teacher_id` fuera del UPDATE: nadie reasigna la titularidad de un curso desde el cliente.
grant update (slug, title, title_em, subtitle, intro, discipline, level, price_cents,
              currency, roman_num, moon_glyph, includes)
  on public.courses to authenticated;
grant delete on public.courses to authenticated;  -- acotado por RLS a curso propio en draft

-- ---------------------------------------------------------------- course_modules
grant select (id, course_id, position, title, description, created_at, updated_at)
  on public.course_modules to anon, authenticated;
grant insert (course_id, position, title, description) on public.course_modules to authenticated;
grant update (position, title, description)            on public.course_modules to authenticated;
grant delete                                            on public.course_modules to authenticated;

-- ---------------------------------------------------------------- lessons
-- `video_id` NO figura en ninguna lista: es columna de service_role, lectura y escritura
-- (ADR-003). RLS filtra filas, no columnas; si `video_id` estuviera en el whitelist de SELECT,
-- cualquier autenticado leeria el id de video de todo curso publicado con la anon key.
-- Es el primer miembro de la CLASE "localizador de contenido pago" (ADR-003 corregido):
-- toda columna de la que se pueda sacar el payload fuera de la app entra en esta clase.
-- Miembros hoy: lessons.video_id, lesson_resources.drive_file_id, lesson_resources.url.
grant select (id, course_id, module_id, position, title, description, video_provider,
              duration_seconds, is_preview, is_published, created_at, updated_at)
  on public.lessons to anon, authenticated;
grant insert (course_id, module_id, position, title, description, video_provider, is_preview)
  on public.lessons to authenticated;
grant update (position, title, description, video_provider, is_preview)
  on public.lessons to authenticated;
grant delete on public.lessons to authenticated;
-- `is_published` tampoco: publicar una leccion exige video_id, que el cliente no puede escribir.
-- `duration_seconds` tampoco (T-012, decision del PO): es la vara contra la que se certifica el
-- progreso (ADR-007) y la escribia la parte interesada. La resuelve el servidor desde la API de
-- YouTube al cargar el video (T-005). Se sigue LEYENDO: alimenta el catalogo y el player.

-- ---------------------------------------------------------------- lesson_chapters
grant select (id, course_id, lesson_id, position, start_seconds, label, created_at, updated_at)
  on public.lesson_chapters to anon, authenticated;
grant insert (course_id, lesson_id, position, start_seconds, label) on public.lesson_chapters to authenticated;
grant update (position, start_seconds, label)                       on public.lesson_chapters to authenticated;
grant delete                                                         on public.lesson_chapters to authenticated;

-- ---------------------------------------------------------------- lesson_resources
-- `drive_file_id` y `url` son LOCALIZADORES de contenido pago: con ese valor se baja el PDF
-- o el audio fuera de la app, sin pasar por ningun control nuestro. Misma clase que
-- `lessons.video_id` (ADR-003 corregido): columna de service_role en lectura Y escritura.
-- Se sirven por Server Action tras verificar has_course_access() o is_preview.
--
-- El RESTO de la fila si es catalogo y se lee sin inscripcion a proposito: tipo, nombre y peso
-- son el "que incluye el curso" de T-004 c.4 — se ve QUE trae, no se accede al archivo.
--
-- Sin INSERT para el cliente: el CHECK lesson_resources_has_target exige uno de los dos
-- localizadores, de modo que un INSERT sin ellos no puede cumplirse nunca. Un grant de INSERT
-- sin las dos columnas seria una trampa (42501 disfrazado de 23514). El alta de recurso es
-- Server Action con service_role, igual que la carga de video (T-005 c.5).
grant select (id, course_id, lesson_id, position, type, name, size_label,
              created_at, updated_at)
  on public.lesson_resources to anon, authenticated;
grant update (position, type, name, size_label)
  on public.lesson_resources to authenticated;
grant delete on public.lesson_resources to authenticated;

-- ---------------------------------------------------------------- enrollments
-- SOLO LECTURA para el cliente. Ni INSERT ni UPDATE ni DELETE, para ningun rol de cliente.
-- La inscripcion la otorga un admin via Server Action con service_role (T-008). Criterio 5(a).
grant select (id, user_id, course_id, status, enrolled_at, granted_by, updated_at)
  on public.enrollments to authenticated;

-- ---------------------------------------------------------------- lesson_progress
grant select (id, user_id, course_id, lesson_id, seconds_watched, completed, completed_at,
              last_seen_at, created_at)
  on public.lesson_progress to authenticated;
-- `completed` y `completed_at` NO son escribibles por el cliente en ninguna de las dos rutas
-- (T-011 c.1): son columnas DERIVADAS de (lesson_id, seconds_watched) y las calculan los guards
-- de 0006. Estaban en el grant de INSERT y eso alcanzaba para auto-certificarse una leccion
-- completada con 1 segundo visto, porque el unico trigger de la tabla era BEFORE UPDATE.
grant insert (user_id, course_id, lesson_id, seconds_watched, last_seen_at)
  on public.lesson_progress to authenticated;
grant update (seconds_watched, last_seen_at)
  on public.lesson_progress to authenticated;

-- ---------------------------------------------------------------- lesson_notes
grant select (id, user_id, course_id, lesson_id, at_seconds, body, created_at, updated_at)
  on public.lesson_notes to authenticated;
grant insert (user_id, course_id, lesson_id, at_seconds, body) on public.lesson_notes to authenticated;
grant update (at_seconds, body)                                on public.lesson_notes to authenticated;
grant delete                                                    on public.lesson_notes to authenticated;
