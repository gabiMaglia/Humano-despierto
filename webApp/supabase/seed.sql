-- T-003 · Seed de contenido real desde los mocks
--
-- Corre con conexion directa como `postgres` (superusuario, bypassa RLS y los grants de
-- columna de 0003_privileges.sql) porque escribe columnas de service_role: courses.status/
-- featured/published_at, lessons.is_published/video_id/duration_seconds.
--
-- Idempotente: todo INSERT usa ON CONFLICT sobre una clave natural (slug, o
-- (course_id,position) / (module_id,position) / (lesson_id,position)) y hace DO UPDATE.
-- Correrlo dos veces seguidas converge al mismo estado, no duplica filas.
--
-- Como correrlo:
--   docker exec -i supabase_db_webApp psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f /dev/stdin < webApp/supabase/seed.sql
-- o, con SUPABASE_DB_URL exportado (webApp/.env.local):
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f webApp/supabase/seed.sql
--
-- Fuente: src/lib/mocks/courses.ts (CATALOG_COURSES + COURSE_DETAIL) y
-- src/lib/mocks/player.ts (LESSON). Mapa mock->tabla: engram/02_architecture.md al final.
--
-- Alcance decidido para T-003 (Advisory, ver handoff): este seed carga courses,
-- course_modules, lessons, lesson_chapters y lesson_resources -- lo que piden el criterio 1
-- y consumen /cursos y /cursos/[slug]. NO siembra profiles de alumnos, enrollments,
-- lesson_progress ni lesson_notes: esas filas son decision de producto de T-007 (panel
-- alumno, "STUDENT.enrolled") y ningun criterio de T-003 las necesita. Los 2 usuarios de
-- prueba de seguridad (alumna@test.local, docente@test.local) se dejan intactos, sin tocar.
--
-- Normalizacion obligatoria (restriccion del ticket): "$ 240" -> price_cents 24000,
-- "52:18" -> duration_seconds 3138. Currency 'ARS': supuesto ya explicito de T-001 (Q-03
-- en 01_requirements.md), no una decision nueva de este ticket.
--
-- Arbol completo (modulos + lecciones + capitulos + recursos) solo existe en el mock para
-- UNA leccion de UN curso (tarot-iniciatico / modulo III / "La cruz celta como mapa del
-- alma"): es todo lo que describen COURSE_DETAIL y LESSON. Los otros 8 cursos del catalogo
-- nacen con sus 0 modulos -- no hay mock de curriculum para ellos, inventarlo violaria P-3.
-- video_id es placeholder (formato valido, "SEEDlessonN"): no hay video real en Fase 2:
-- Advisory. No queda publicable por T-005/T-006 hasta que una docente cargue el real.

begin;

-- ---------------------------------------------------------------- profiles docentes
-- profiles.id -> auth.users(id): hace falta una fila real de auth.users por cada docente
-- del catalogo. Se crean con UUID fijo (propios de este seed, no tocan los fixtures de
-- seguridad de T-001). El trigger on_auth_user_created siembra profiles con role='student'
-- literal (ADR-006) y full_name desde raw_user_meta_data; el UPDATE de mas abajo corrige
-- el rol a 'teacher' y completa slug/bio -- eso el trigger no lo hace.

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  ('a0000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'luna.arce@seed.humano.local',
   crypt('seed-teacher-1234', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Luna Arce"}'::jsonb,
   now(), now(), '', '', '', ''),
  ('a0000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'sol.mayor@seed.humano.local',
   crypt('seed-teacher-1234', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Sol Mayor"}'::jsonb,
   now(), now(), '', '', '', ''),
  ('a0000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'aurora.violeta@seed.humano.local',
   crypt('seed-teacher-1234', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Aurora Violeta"}'::jsonb,
   now(), now(), '', '', '', '')
on conflict (id) do nothing;

update public.profiles set
  role = 'teacher',
  full_name = v.full_name,
  slug = v.slug,
  glyph = v.glyph,
  bio = v.bio
from (values
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'Luna Arce', 'luna-arce', '☾', null::text),
  ('a0000000-0000-4000-8000-000000000002'::uuid, 'Sol Mayor', 'sol-mayor', '☉',
   'El tarot no predice; refleja. En este recorrido aprenderás a ser un espejo claro para quien busca verse.'),
  ('a0000000-0000-4000-8000-000000000003'::uuid, 'Aurora Violeta', 'aurora-violeta', '✦', null::text)
) as v(id, full_name, slug, glyph, bio)
where public.profiles.id = v.id;

-- ---------------------------------------------------------------- courses (CATALOG_COURSES)
-- price_cents = round(mock "$ N" * 100). roman_num/moon_glyph = num/moon del mock (editorial,
-- no derivan de nada). subtitle/intro/includes solo existen en el mock para tarot-iniciatico
-- (COURSE_DETAIL); el resto usa el "desc" del catalogo como intro y queda sin subtitle/includes.

with teachers as (
  select id, full_name from public.profiles
  where full_name in ('Luna Arce', 'Sol Mayor', 'Aurora Violeta')
)
-- published_at se siembra escalonado (1 dia por curso, en el orden I..IX del catalogo) en
-- vez de now() para los 9 iguales: /cursos ordena por published_at y sin esto los 9 quedan
-- en orden indefinido (Postgres no garantiza orden de insercion en un scan). No es un dato
-- inventado -- es la unica columna real que puede expresar el orden editorial del mock.
insert into public.courses (
  id, slug, title, title_em, subtitle, intro, discipline, level, price_cents, currency,
  roman_num, moon_glyph, includes, teacher_id, status, featured, published_at
)
select
  gen_random_uuid(), v.slug, v.title, v.title_em, v.subtitle, v.intro, v.discipline, v.level,
  v.price_cents, 'ARS', v.roman_num, v.moon_glyph, v.includes, t.id, 'published', v.featured,
  timestamptz '2026-01-01' + (v.seq * interval '1 day')
from (values
  (1, 'carta-natal-esencial', 'Carta natal', 'esencial', null::text,
   'El mapa del alma encarnada en doce casas.', 'Astrología', 'Inicial', 24000, 'I', '○',
   array[]::text[], 'Luna Arce', false),
  (2, 'tarot-iniciatico', 'Tarot', 'iniciático',
   'los 22 arcanos como espejo del alma',
   'Diez semanas para aprender a sostener una consulta de tarot con ética, profundidad simbólica y presencia. No memorizar significados — leer el espejo que la carta tiende.',
   'Tarot', 'Maestría', 28000, 'II', '◑',
   array[
     'Acceso de por vida a las grabaciones',
     '10 sesiones live por Zoom con Sol Mayor',
     'Mazo de tarot de Marsella enviado a domicilio',
     'Cuaderno de bitácora encuadernado',
     'Círculo cerrado de práctica entre cohorte',
     'Certificado al cierre del recorrido'
   ]::text[], 'Sol Mayor', true),
  (3, 'reiki-nivel-1', 'Reiki', 'nivel I', null,
   'Iniciación en la imposición de manos.', 'Reiki', 'Inicial', 18000, 'III', '●',
   array[]::text[], 'Aurora Violeta', false),
  (4, 'transitos-retornos', 'Tránsitos y', 'retornos', null,
   'Leer el cielo del ahora sobre la carta.', 'Astrología', 'Intermedio', 32000, 'IV', '◐',
   array[]::text[], 'Luna Arce', false),
  (5, 'herbario-lunar', 'Herbario', 'lunar', null,
   'Plantas aliadas según la fase de la luna.', 'Herbal', 'Intermedio', 22000, 'V', '◑',
   array[]::text[], 'Aurora Violeta', false),
  (6, 'arcanos-menores', 'Arcanos', 'menores', null,
   'Los cuatro elementos como caminos de práctica.', 'Tarot', 'Intermedio', 20000, 'VI', '○',
   array[]::text[], 'Sol Mayor', false),
  (7, 'reiki-nivel-3', 'Reiki', 'nivel III', null,
   'Maestría y transmisión de la línea Usui.', 'Reiki', 'Maestría', 48000, 'VII', '●',
   array[]::text[], 'Aurora Violeta', false),
  (8, 'doce-casas', 'Las', 'doce casas', null,
   'Una a una, el escenario donde el cielo actúa.', 'Astrología', 'Inicial', 16000, 'VIII', '◑',
   array[]::text[], 'Luna Arce', false),
  (9, 'tinturas-iniciales', 'Tinturas', 'iniciales', null,
   'Preparación de tinturas madre con intención.', 'Herbal', 'Inicial', 14000, 'IX', '◐',
   array[]::text[], 'Aurora Violeta', false)
) as v(seq, slug, title, title_em, subtitle, intro, discipline, level, price_cents, roman_num,
       moon_glyph, includes, teacher_name, featured)
join teachers t on t.full_name = v.teacher_name
on conflict (slug) do update set
  title = excluded.title, title_em = excluded.title_em, subtitle = excluded.subtitle,
  intro = excluded.intro, discipline = excluded.discipline, level = excluded.level,
  price_cents = excluded.price_cents, currency = excluded.currency,
  roman_num = excluded.roman_num, moon_glyph = excluded.moon_glyph,
  includes = excluded.includes, teacher_id = excluded.teacher_id,
  status = excluded.status, featured = excluded.featured, published_at = excluded.published_at;

-- ---------------------------------------------------------------- course_modules (COURSE_DETAIL.modules)
-- Solo tarot-iniciatico tiene modulos en el mock.
--
-- Los UNIQUE de posicion (course_modules_position_key, lessons_position_key, ...) son
-- DEFERRABLE (a proposito: swap de posiciones al reordenar, ADR nota #6) y Postgres NO
-- permite usar un unique constraint deferrable como arbiter de ON CONFLICT. Idempotencia
-- para este subarbol = borrar y re-crear, scopeado al curso: DELETE en course_modules
-- cascada a lessons -> lesson_chapters/lesson_resources (y a lesson_progress/lesson_notes
-- si existieran, pero T-003 no siembra esas tablas -- ver nota de alcance arriba).

with tarot as (select id from public.courses where slug = 'tarot-iniciatico')
delete from public.course_modules using tarot where public.course_modules.course_id = tarot.id;

with tarot as (select id from public.courses where slug = 'tarot-iniciatico')
insert into public.course_modules (id, course_id, position, title, description)
select gen_random_uuid(), tarot.id, v.position, v.title, v.description
from tarot, (values
  (1, 'El loco emprende camino', 'Arquetipos, viaje del héroe, los tres arcanos del comienzo.'),
  (2, 'Los planetas y las cartas', 'Correspondencias planetarias en el tarot de Marsella y Rider-Waite.'),
  (3, 'Las tiradas', 'Tres cartas, cruz celta, árbol de la vida. Estructura ritual de la consulta.'),
  (4, 'Sostener al consultante', 'Ética, encuadre, qué decir y qué callar. La presencia como herramienta.'),
  (5, 'Síntesis y práctica final', 'Consultas reales sostenidas en grupo. Devolución de la maestra.')
) as v(position, title, description);

-- ---------------------------------------------------------------- lessons (LESSON.modules[2].lessonList)
-- Solo el modulo III ("Las tiradas") tiene lecciones reales en el mock (player.ts). Los
-- demas modulos solo traen un conteo ("lessons: 4") sin titulo/duracion -- no hay dato que
-- sembrar sin inventarlo. duration_seconds sale de "MM:SS" -> segundos, nunca 0.

with target as (
  select cm.id as module_id, cm.course_id
  from public.course_modules cm
  join public.courses c on c.id = cm.course_id
  where c.slug = 'tarot-iniciatico' and cm.position = 3
)
insert into public.lessons (
  id, course_id, module_id, position, title, video_provider, video_id,
  duration_seconds, is_preview, is_published
)
select gen_random_uuid(), target.course_id, target.module_id, v.position, v.title,
  'youtube', v.video_id, v.duration_seconds, false, true
from target, (values
  (1, 'Tirada de tres cartas',              'SEEDlesson1', 2292),
  (2, 'El presente, lo oculto, el consejo', 'SEEDlesson2', 2528),
  (3, 'Apertura del hexagrama',             'SEEDlesson3', 2814),
  (4, 'La cruz celta como mapa del alma',   'SEEDlesson4', 3138),
  (5, 'El árbol de la vida',                'SEEDlesson5', 3840)
) as v(position, title, video_id, duration_seconds);

-- ---------------------------------------------------------------- lesson_chapters (LESSON.chapters)
-- Todas pertenecen a la leccion IV del modulo III ("La cruz celta como mapa del alma").

with target as (
  select l.id as lesson_id, l.course_id
  from public.lessons l
  join public.course_modules cm on cm.id = l.module_id
  join public.courses c on c.id = l.course_id
  where c.slug = 'tarot-iniciatico' and cm.position = 3 and l.position = 4
)
insert into public.lesson_chapters (id, course_id, lesson_id, position, start_seconds, label)
select gen_random_uuid(), target.course_id, target.lesson_id, v.position, v.start_seconds, v.label
from target, (values
  (1, 0,    'Apertura · ritual de entrada'),
  (2, 270,  'Las diez posiciones, una por una'),
  (3, 1100, 'Cómo leer las relaciones entre cartas'),
  (4, 1920, 'Dos consultas reales en grupo'),
  (5, 2770, 'Cierre · qué llevarse a la práctica')
) as v(position, start_seconds, label);

-- ---------------------------------------------------------------- lesson_resources (LESSON.resources)
-- drive_file_id es placeholder: no hay Drive real en Fase 2. size_label es texto libre
-- publico a proposito (catalogo, T-005 c.5b) -- se respeta tal cual viene del mock.

with target as (
  select l.id as lesson_id, l.course_id
  from public.lessons l
  join public.course_modules cm on cm.id = l.module_id
  join public.courses c on c.id = l.course_id
  where c.slug = 'tarot-iniciatico' and cm.position = 3 and l.position = 4
)
insert into public.lesson_resources (id, course_id, lesson_id, position, type, name, drive_file_id, size_label)
select gen_random_uuid(), target.course_id, target.lesson_id, v.position, v.type, v.name, v.drive_file_id, v.size_label
from target, (values
  (1, 'pdf',   'Mapa de la cruz celta · 10 posiciones', 'SEED_PLACEHOLDER_PDF_1',   '1.2 MB'),
  (2, 'audio', 'Meditación previa a la consulta',        'SEED_PLACEHOLDER_AUDIO_1', '14:08'),
  (3, 'texto', 'Bibliografía · Jodorowsky cap. IV',       'SEED_PLACEHOLDER_TEXT_1',  '8 págs')
) as v(position, type, name, drive_file_id, size_label);

commit;
