-- T-003/T-017 · Seed de contenido real desde los mocks
--
-- Corre con conexion directa como `postgres` (superusuario, bypassa RLS y los grants de
-- columna de 0003_privileges.sql) porque escribe columnas de service_role: courses.status/
-- featured/published_at, lessons.is_published/video_id/duration_seconds,
-- profiles.years_practice/formations/testimonials (T-017, ver 0011).
--
-- Idempotente: todo INSERT usa ON CONFLICT sobre una clave natural (slug, o
-- (course_id,position) / (module_id,position) / (lesson_id,position)) y hace DO UPDATE, o
-- (para los subarboles con UNIQUE deferrable, que no sirve de arbiter de ON CONFLICT) DELETE +
-- re-INSERT scopeado al curso. Correrlo dos veces seguidas converge al mismo estado, no duplica.
--
-- Como correrlo:
--   docker exec -i supabase_db_webApp psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f /dev/stdin < webApp/supabase/seed.sql
-- o, con SUPABASE_DB_URL exportado (webApp/.env.local):
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f webApp/supabase/seed.sql
--
-- ============================================================================================
-- T-017 · POR QUE ESTE ARCHIVO CRECE (handoff: "el seed es lo primero, no lo ultimo").
-- Medido en T-017: de los 9 cursos publicados, 8 tenian CERO modulos. El front seguia apoyado en
-- mocks porque no habia de donde leer. Este seed pasa a cargar curriculum real (>=3 modulos y
-- >=6 lecciones por curso, criterio 2) para los 8 cursos que lo tenian vacio, mas la ficha
-- publica completa de las 3 docentes (bio/formacion/testimonios -- decision de esquema en la
-- migracion 0011, con el fundamento completo ahi) y 3 alumnas con progreso DISTINTO entre si
-- (criterio 3): recien empezada, a la mitad, curso completo.
--
-- Fuente de las 3 docentes: `src/lib/mocks/guia.ts` (GUIAS), con una reconciliacion necesaria --
-- ese mock describe 5 personas (sol-mayor, luna-arce, luz-marini, mara-iturri, ines-volpe) que
-- NUNCA se alinearon con las 3 docentes reales que ya tienen cursos asignados en este mismo seed
-- desde T-003 (Luna Arce, Sol Mayor, Aurora Violeta -- ver `CATALOG_COURSES` en `landing.ts`):
-- "Aurora Violeta" no tiene ficha en `guia.ts`, y "Luz Marini"/"Mara Iturri"/"Ines Volpe" no
-- dictan ninguno de los 9 cursos del catalogo. Mostrar en /guias a alguien sin un solo curso
-- real es peor que no mostrarla (mismo criterio de "no prometer lo que no hay" de ADR-004/T-014).
-- Se sembra la ficha publica de las 3 docentes CON CURSOS REALES: el bio/formaciones/testimonios
-- de Sol Mayor y Luna Arce se toman de `guia.ts` (ya estaban escritos en la voz del proyecto); los
-- de Aurora Violeta se redactan de cero en la misma voz -- mismo criterio que uso T-013 para las
-- guias que no tenian perfil ("redactar el contenido faltante en la voz del proyecto, sin lorem
-- ipsum"). `birthChart`/`sun`/`moon`/`asc`/`rating` de `guia.ts` NO se siembran: decision y
-- fundamento completos en la migracion 0011 (se descartan, no tienen destino en el esquema).
--
-- Fuente del curriculum de los 8 cursos vacios: NO existe en ningun mock (`COURSE_DETAIL`/
-- `LESSON` solo describian tarot-iniciatico). Redactado de cero para este seed, en la misma voz
-- (registro sobrio, simbolico, sin relleno generico) -- es la unica forma de cumplir el criterio
-- 2 sin inventar un mock que no existia y sin dejar el catalogo vacio, que era el bloqueo medido.
-- video_id/duration_seconds: se REUSAN los 5 cortos de Blender ya verificados contra la API de
-- YouTube en T-006 (ver mas abajo) -- explicitamente aceptado por el handoff de T-017: "nadie
-- espera 100 videos distintos" en datos de desarrollo.
--
-- Alcance de T-003 (heredado, sigue valiendo): "$ 240" -> price_cents 24000, "52:18" ->
-- duration_seconds 3138. Currency 'ARS': supuesto ya explicito de T-001 (Q-03 en
-- 01_requirements.md).
--
-- T-006 (heredado): los video_id son 5 cortos oficiales de Blender Foundation/Studio (dominio CC,
-- canal propio estable hace mas de una decada, embeddable confirmado via oembed publico): Spring,
-- Big Buck Bunny, Elephants Dream, Sintel, Tears of Steel. duration_seconds sale de la duracion
-- REAL de cada video (verificada contra la API de YouTube Data v3, `videos.list?part=
-- contentDetails`, no inventada -- el umbral del 90% de ADR-007 se certifica contra un numero
-- verificado):
--   WhWc3b3KhnY = 465s (Spring) · YE7VzlLtp-4 = 597s (Big Buck Bunny) ·
--   TLkA0RELQ1g = 655s (Elephants Dream) · eRsGyueVLvQ = 888s (Sintel) ·
--   R6MlUcmOul8 = 735s (Tears of Steel)
--
-- T-017 · progreso de alumnas y el TOPE DE RELOJ DE T-015 (0009). `guard_lesson_progress_insert`
-- acota `seconds_watched` al insertar a `least(valor, tope(now()))`, y `tope(now())` da SIEMPRE
-- 10 (no hay escritura previa contra la que medir tiempo real transcurrido: ver 0009:76-78 y su
-- propio comentario). Verificado en vivo antes de escribir esto: un INSERT directo con
-- `seconds_watched=850` deja la fila en `10`, no en `850`. Por eso estas filas se escriben con
-- `session_replication_role = replica` (deshabilita los triggers de la sesion, no las RLS/CHECKs:
-- el CHECK `completed = (completed_at is not null)` de 0001 se sigue evaluando, asi que
-- `completed`/`completed_at` se escriben coherentes a mano) -- es la unica via para sembrar
-- progreso alto en una sola pasada, tal como anticipa el handoff ("escribi el valor final
-- directamente en el INSERT"). Fuera de este bloque puntual, el resto del archivo sigue sin
-- bypassear ningun trigger.

begin;

-- ---------------------------------------------------------------- profiles docentes
-- profiles.id -> auth.users(id): hace falta una fila real de auth.users por cada docente
-- del catalogo. Se crean con UUID fijo (propios de este seed, no tocan los fixtures de
-- seguridad de T-001). El trigger on_auth_user_created siembra profiles con role='student'
-- literal (ADR-006) y full_name desde raw_user_meta_data; el UPDATE de mas abajo corrige
-- el rol a 'teacher' y completa la ficha publica -- eso el trigger no lo hace.

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
  headline = v.headline,
  location = v.location,
  quote = v.quote,
  years_practice = v.years_practice,
  bio = v.bio,
  formations = v.formations::jsonb,
  testimonials = v.testimonials::jsonb
from (values
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'Luna Arce', 'luna-arce', '☾',
   'Astróloga · Tarotista', 'Ciudad de México · México',
   'No enseño técnicas, enseño a escuchar lo que ya sabe el cuerpo.', 14::smallint,
   'Luna aprendió a mirar el cielo antes que a leer. En el patio de su abuela, en Coyoacán, las noches se contaban por constelaciones y las tardes por las cartas que tendía para las vecinas del barrio. A los nueve años ya sabía señalar dónde caía la Casa X sin saber todavía qué significaba.' || chr(10) || chr(10) ||
   'Se formó en astrología tropical durante tres años y completó el recorrido con un estudio autodidacta del tarot de Marsella, contrastando cada arcano contra tránsitos reales hasta encontrar dónde se tocan las dos lenguas. Catorce años después enseña con una sola certeza: ninguna técnica reemplaza la escucha atenta de lo que el cuerpo ya sabía antes que la carta lo dijera.',
   '[
     {"year":"MMXII","title":"Astrología tropical · casas y aspectos","place":"Ciudad de México"},
     {"year":"MMXV","title":"Tarot de Marsella · estudio de arcanos","place":"Ciudad de México"},
     {"year":"MMXVIII","title":"Astrología predictiva · tránsitos y progresiones","place":"Online"},
     {"year":"MMXXII","title":"Ética de la consulta astrológica","place":"Bogotá"}
   ]',
   '[
     {"quote":"Me enseñó a leer mi carta natal sin buscar excusas en ella — a usarla como espejo, no como sentencia.","who":"Renata G.","course":"Carta natal esencial"},
     {"quote":"Explica el cielo con una claridad que no había encontrado en años de leer sola.","who":"Emiliano D.","course":"Las doce casas"},
     {"quote":"Cada tránsito que temía se volvió, con ella, una pregunta y no una condena.","who":"Paula S.","course":"Tránsitos y retornos"}
   ]'),
  ('a0000000-0000-4000-8000-000000000002'::uuid, 'Sol Mayor', 'sol-mayor', '☉',
   'Tarotista · Astróloga', 'Buenos Aires · Argentina',
   'No leemos el futuro. Leemos el alma del momento presente.', 18::smallint,
   'Sol llegó al tarot a los diecinueve años, cuando una abuela vasca le puso un mazo en las manos y le dijo: "no leas las cartas, dejá que ellas te lean a vos".' || chr(10) || chr(10) ||
   'Estudió astrología tropical con Eugenio Carutti en Buenos Aires y se formó en el tarot de Marsella con la escuela de Alejandro Jodorowsky en Francia. Dieciocho años después, sigue creyendo que el oficio es escuchar.',
   '[
     {"year":"MMVIII","title":"Tarot de Marsella · Jodorowsky","place":"París"},
     {"year":"MMXII","title":"Astrología tropical · Casa XI","place":"Buenos Aires"},
     {"year":"MMXVI","title":"Cábala y simbolismo","place":"Jerusalén"},
     {"year":"MMXX","title":"Trauma-informed counseling","place":"Online"}
   ]',
   '[
     {"quote":"Hizo de un mazo de cartas un espejo del que no quiero alejarme.","who":"Lía M.","course":"Tarot iniciático"},
     {"quote":"Sostiene como pocas. Te empuja al borde con una ternura que da miedo y abraza.","who":"Joaquín R.","course":"Tarot iniciático"},
     {"quote":"Sol no enseña. Te recuerda algo que ya sabías.","who":"Camila V.","course":"Arcanos menores"}
   ]'),
  ('a0000000-0000-4000-8000-000000000003'::uuid, 'Aurora Violeta', 'aurora-violeta', '✦',
   'Herbolaria · Maestra de Reiki', 'Córdoba · Argentina',
   'El cuerpo no miente. Las manos y las plantas solo lo ayudan a recordarlo.', 12::smallint,
   'Aurora llegó al Reiki buscando alivio para un cuerpo agotado y se quedó por la pregunta que le abrió: ¿qué pasa si el silencio, sostenido con las manos, es en sí mismo una forma de cuidado? De ahí a la herbolaria hubo un solo paso — las plantas del patio de su madre, que ella miraba sin nombrar, empezaron a pedir ser aprendidas.' || chr(10) || chr(10) ||
   'Recibió la maestría en la línea Usui y complementó su formación con herbolaria tradicional y fitoterapia. Doce años después enseña las dos disciplinas con el mismo principio: acompañar el proceso del cuerpo, nunca apurarlo ni reemplazar su criterio.',
   '[
     {"year":"MMXIV","title":"Reiki nivel I y II · línea Usui","place":"Córdoba"},
     {"year":"MMXVII","title":"Herbolaria tradicional y fitoterapia","place":"Córdoba"},
     {"year":"MMXXI","title":"Reiki nivel III · maestría","place":"Buenos Aires"}
   ]',
   '[
     {"quote":"No promete nada que no pueda sostener. Solo silencio, presencia y manos quietas — y con eso alcanza.","who":"Marcos T.","course":"Reiki nivel I"},
     {"quote":"Me enseñó a reconocer lo que ya crecía en mi propio patio. Dejé de buscar tan lejos.","who":"Valeria N.","course":"Herbario lunar"},
     {"quote":"Enseña con una calma que se contagia antes de que abra la boca.","who":"Diego C.","course":"Reiki nivel III"}
   ]')
) as v(id, full_name, slug, glyph, headline, location, quote, years_practice, bio, formations, testimonials)
where public.profiles.id = v.id;

-- ---------------------------------------------------------------- courses (CATALOG_COURSES)
-- price_cents = round(mock "$ N" * 100). roman_num/moon_glyph = num/moon del mock (editorial,
-- no derivan de nada). subtitle/intro/includes solo existen en el mock para tarot-iniciatico
-- (COURSE_DETAIL); el resto usa el "desc" del catalogo como intro y queda sin subtitle/includes.
--
-- T-017 · `featured=true` en 3 de los 9 (uno por docente: tarot-iniciatico, carta-natal-esencial,
-- reiki-nivel-1), no solo en tarot-iniciatico como venia de T-003. `FeaturedCourses` (landing)
-- pasa a leer `courses.featured` en vez del mock `COURSES` (criterio 1 del ticket) y necesita
-- 3 destacados reales para la grilla de 3 columnas -- con 1 solo la seccion quedaba coja.

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
   array[]::text[], 'Luna Arce', true),
  (2, 'tarot-iniciatico', 'Tarot', 'iniciático',
   'los 22 arcanos como espejo del alma',
   'Diez semanas para aprender a sostener una consulta de tarot con ética, profundidad simbólica y presencia. No memorizar significados — leer el espejo que la carta tiende.',
   'Tarot', 'Maestría', 28000, 'II', '◑',
   array[
     'Acceso de por vida a las grabaciones',
     'Diez encuentros grabados con Sol Mayor',
     'Mazo de tarot de Marsella enviado a domicilio',
     'Cuaderno de bitácora encuadernado',
     'Círculo cerrado de práctica entre estudiantes',
     'Certificado al cierre del recorrido'
   ]::text[], 'Sol Mayor', true),
  (3, 'reiki-nivel-1', 'Reiki', 'nivel I', null,
   'Iniciación en la imposición de manos.', 'Reiki', 'Inicial', 18000, 'III', '●',
   array[]::text[], 'Aurora Violeta', true),
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

-- ---------------------------------------------------------------- course_modules + lessons de tarot-iniciatico
-- Los UNIQUE de posicion (course_modules_position_key, lessons_position_key, ...) son
-- DEFERRABLE (a proposito: swap de posiciones al reordenar, ADR nota #6) y Postgres NO
-- permite usar un unique constraint deferrable como arbiter de ON CONFLICT. Idempotencia
-- para este subarbol = borrar y re-crear, scopeado al curso: DELETE en course_modules
-- cascada a lessons -> lesson_chapters/lesson_resources (y a lesson_progress/lesson_notes
-- de ESTE curso, que T-017 SI siembra mas abajo -- se re-crean junto con el resto).

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

-- T-017 · criterio 2 exige >=6 lecciones por curso: el mock (T-003) solo daba 5, todas en el
-- modulo III ("Las tiradas"). Se agregan 2 lecciones nuevas al modulo I ("El loco emprende
-- camino"), redactadas de cero en la misma voz -- no hay mock que las describa.
with target as (
  select cm.id as module_id, cm.course_id, cm.position as module_position
  from public.course_modules cm
  join public.courses c on c.id = cm.course_id
  where c.slug = 'tarot-iniciatico' and cm.position in (1, 3)
)
insert into public.lessons (
  id, course_id, module_id, position, title, video_provider, video_id,
  duration_seconds, is_preview, is_published
)
select gen_random_uuid(), target.course_id, target.module_id, v.position, v.title,
  'youtube', v.video_id, v.duration_seconds, v.is_preview, true
from target, (values
  -- video_id / duration_seconds verificados contra la API de YouTube Data v3, no inventados.
  -- Los 5 son Blender Foundation/Studio, CC, embeddable (ver cabecera del archivo).
  (1, 1, 'El arquetipo del Loco y el viaje del héroe',   'TLkA0RELQ1g', 655, false), -- Elephants Dream
  (1, 2, 'Los tres primeros arcanos: Loco, Mago, Sacerdotisa', 'eRsGyueVLvQ', 888, false), -- Sintel
  (3, 1, 'Tirada de tres cartas',              'WhWc3b3KhnY', 465, true),  -- Spring
  (3, 2, 'El presente, lo oculto, el consejo', 'YE7VzlLtp-4', 597, false), -- Big Buck Bunny
  (3, 3, 'Apertura del hexagrama',             'TLkA0RELQ1g', 655, false), -- Elephants Dream
  (3, 4, 'La cruz celta como mapa del alma',   'eRsGyueVLvQ', 888, false), -- Sintel
  (3, 5, 'El árbol de la vida',                'R6MlUcmOul8', 735, false)  -- Tears of Steel
) as v(module_position, position, title, video_id, duration_seconds, is_preview)
where v.module_position = target.module_position;

-- ---------------------------------------------------------------- lesson_chapters (LESSON.chapters)
-- Todas pertenecen a la leccion IV del modulo III ("La cruz celta como mapa del alma").
-- start_seconds re-escalado a la duracion REAL del video (Sintel, 888s) -- ver T-006 en la
-- cabecera del archivo.
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
  (1, 0,   'Apertura · ritual de entrada'),
  (2, 76,  'Las diez posiciones, una por una'),
  (3, 311, 'Cómo leer las relaciones entre cartas'),
  (4, 543, 'Dos consultas reales en grupo'),
  (5, 784, 'Cierre · qué llevarse a la práctica')
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

-- ============================================================================================
-- T-017 · curriculum de los 8 cursos que tenian CERO modulos (el bloqueo medido del ticket).
-- Redactado de cero, en la misma voz del proyecto: no hay mock de origen para estos cursos (a
-- diferencia de tarot-iniciatico, que si venia de COURSE_DETAIL/LESSON). 3 modulos y 6 lecciones
-- por curso (criterio 2, con margen). video_id/duration_seconds: se reusan los mismos 5 cortos
-- de Blender ya verificados (ver cabecera). La primera leccion de cada curso queda is_preview.

with cursos as (
  select id, slug from public.courses where slug in (
    'carta-natal-esencial', 'reiki-nivel-1', 'transitos-retornos', 'herbario-lunar',
    'arcanos-menores', 'reiki-nivel-3', 'doce-casas', 'tinturas-iniciales'
  )
)
delete from public.course_modules using cursos where public.course_modules.course_id = cursos.id;

with cursos as (
  select id, slug from public.courses where slug in (
    'carta-natal-esencial', 'reiki-nivel-1', 'transitos-retornos', 'herbario-lunar',
    'arcanos-menores', 'reiki-nivel-3', 'doce-casas', 'tinturas-iniciales'
  )
)
insert into public.course_modules (id, course_id, position, title, description)
select gen_random_uuid(), cursos.id, v.position, v.title, v.description
from cursos
join (values
  -- ---------------------------------------------------------- carta-natal-esencial
  ('carta-natal-esencial', 1, 'Los cimientos del cielo', 'Signos, planetas y casas: el alfabeto antes de leer la frase.'),
  ('carta-natal-esencial', 2, 'Los doce sectores de la vida', 'Recorrido casa por casa, con ejemplos de cartas reales.'),
  ('carta-natal-esencial', 3, 'Leer una carta completa', 'Síntesis: cómo se integran signo, planeta y casa en una lectura.'),
  -- ---------------------------------------------------------- reiki-nivel-1
  ('reiki-nivel-1', 1, 'Fundamentos del canal', 'Qué es la energía vital, ética del oficio, encuadre de una sesión.'),
  ('reiki-nivel-1', 2, 'Las posiciones básicas', 'Imposición de manos, secuencia completa, cuerpo sutil.'),
  ('reiki-nivel-1', 3, 'La iniciación', 'El símbolo, la sintonización, la práctica sostenida en el tiempo.'),
  -- ---------------------------------------------------------- transitos-retornos
  ('transitos-retornos', 1, 'El cielo en movimiento', 'Tránsitos rápidos y lentos, cómo se leen sobre la carta natal.'),
  ('transitos-retornos', 2, 'El retorno solar', 'El mapa del año que empieza, leído desde la carta de nacimiento.'),
  ('transitos-retornos', 3, 'Ciclos mayores', 'Saturno, Urano, Plutón: las crisis que reordenan.'),
  -- ---------------------------------------------------------- herbario-lunar
  ('herbario-lunar', 1, 'El calendario lunar y la cosecha', 'Cuándo cortar, cuándo sembrar, por qué importa la fase.'),
  ('herbario-lunar', 2, 'Plantas de luna creciente y llena', 'Fortalecer, expandir, sostener.'),
  ('herbario-lunar', 3, 'Plantas de luna menguante y nueva', 'Soltar, limpiar, iniciar.'),
  -- ---------------------------------------------------------- arcanos-menores
  ('arcanos-menores', 1, 'Bastos: el elemento fuego', 'Impulso, deseo, acción.'),
  ('arcanos-menores', 2, 'Copas y Espadas: agua y aire', 'Emoción y pensamiento en diálogo.'),
  ('arcanos-menores', 3, 'Oros: el elemento tierra', 'Cuerpo, trabajo, sostén material.'),
  -- ---------------------------------------------------------- reiki-nivel-3
  ('reiki-nivel-3', 1, 'El camino a la maestría', 'Qué cambia del nivel II al III, responsabilidad del canal.'),
  ('reiki-nivel-3', 2, 'Los símbolos de maestría', 'Estudio y práctica sostenida.'),
  ('reiki-nivel-3', 3, 'Transmitir la iniciación', 'Cómo se sintoniza a otra persona, ética de enseñar.'),
  -- ---------------------------------------------------------- doce-casas
  ('doce-casas', 1, 'Casas angulares', 'I, IV, VII, X: identidad, raíz, vínculo, vocación.'),
  ('doce-casas', 2, 'Casas sucedentes', 'II, V, VIII, XI: recursos, creación, transformación, comunidad.'),
  ('doce-casas', 3, 'Casas cadentes', 'III, VI, IX, XII: aprendizaje, servicio, sentido, disolución.'),
  -- ---------------------------------------------------------- tinturas-iniciales
  ('tinturas-iniciales', 1, 'Principios de la tintura', 'Alcohol, planta, tiempo: la maceración como método.'),
  ('tinturas-iniciales', 2, 'Selección y proporciones', 'Qué planta, qué grado alcohólico, cuánto tiempo.'),
  ('tinturas-iniciales', 3, 'Ritual y conservación', 'Intención en la preparación, etiquetado, vida útil.')
) as v(slug, position, title, description) on v.slug = cursos.slug;

with cursos as (
  select id, slug from public.courses where slug in (
    'carta-natal-esencial', 'reiki-nivel-1', 'transitos-retornos', 'herbario-lunar',
    'arcanos-menores', 'reiki-nivel-3', 'doce-casas', 'tinturas-iniciales'
  )
),
modulos as (
  select cm.id as module_id, cm.course_id, c.slug, cm.position as module_position
  from public.course_modules cm
  join cursos c on c.id = cm.course_id
)
insert into public.lessons (
  id, course_id, module_id, position, title, video_provider, video_id,
  duration_seconds, is_preview, is_published
)
select gen_random_uuid(), modulos.course_id, modulos.module_id, v.position, v.title,
  'youtube', v.video_id, v.duration_seconds, (v.module_position = 1 and v.position = 1), true
from modulos
join (values
  -- video_id / duration_seconds: los mismos 5 cortos de Blender verificados (ver cabecera),
  -- ciclados 1..5,1 dentro de cada curso. is_preview = primera leccion del modulo I.
  ('carta-natal-esencial', 1, 1, 'El zodíaco y los cuatro elementos',              'WhWc3b3KhnY', 465),
  ('carta-natal-esencial', 1, 2, 'Los diez cuerpos y su función',                  'YE7VzlLtp-4', 597),
  ('carta-natal-esencial', 2, 1, 'Casas angulares: identidad, hogar, vínculo, vocación', 'TLkA0RELQ1g', 655),
  ('carta-natal-esencial', 2, 2, 'Casas sucedentes y cadentes',                    'eRsGyueVLvQ', 888),
  ('carta-natal-esencial', 3, 1, 'Aspectos: el diálogo entre planetas',            'R6MlUcmOul8', 735),
  ('carta-natal-esencial', 3, 2, 'Práctica: tu propia carta natal',                'WhWc3b3KhnY', 465),

  ('reiki-nivel-1', 1, 1, 'Qué es el Reiki y qué no promete',                      'WhWc3b3KhnY', 465),
  ('reiki-nivel-1', 1, 2, 'Ética del canal: cuidar sin invadir',                   'YE7VzlLtp-4', 597),
  ('reiki-nivel-1', 2, 1, 'Secuencia de manos: cabeza y torso',                    'TLkA0RELQ1g', 655),
  ('reiki-nivel-1', 2, 2, 'Secuencia de manos: piernas y cierre',                  'eRsGyueVLvQ', 888),
  ('reiki-nivel-1', 3, 1, 'La sintonización: qué sucede y qué no',                 'R6MlUcmOul8', 735),
  ('reiki-nivel-1', 3, 2, 'Sostener la práctica después del curso',                'WhWc3b3KhnY', 465),

  ('transitos-retornos', 1, 1, 'Tránsitos rápidos: Luna, Mercurio, Venus, Marte',  'WhWc3b3KhnY', 465),
  ('transitos-retornos', 1, 2, 'Tránsitos lentos: Júpiter y Saturno',              'YE7VzlLtp-4', 597),
  ('transitos-retornos', 2, 1, 'Armar un retorno solar propio',                    'TLkA0RELQ1g', 655),
  ('transitos-retornos', 2, 2, 'Leer el año: casas activadas',                     'eRsGyueVLvQ', 888),
  ('transitos-retornos', 3, 1, 'El retorno de Saturno: qué se pone a prueba',      'R6MlUcmOul8', 735),
  ('transitos-retornos', 3, 2, 'Urano y Plutón: la crisis como umbral',            'WhWc3b3KhnY', 465),

  ('herbario-lunar', 1, 1, 'Las cuatro fases y su lógica agrícola',                'WhWc3b3KhnY', 465),
  ('herbario-lunar', 1, 2, 'Herramientas y momento del día',                       'YE7VzlLtp-4', 597),
  ('herbario-lunar', 2, 1, 'Plantas para fortalecer: creciente',                   'TLkA0RELQ1g', 655),
  ('herbario-lunar', 2, 2, 'Plantas para sostener: luna llena',                    'eRsGyueVLvQ', 888),
  ('herbario-lunar', 3, 1, 'Plantas para limpiar: menguante',                      'R6MlUcmOul8', 735),
  ('herbario-lunar', 3, 2, 'Plantas para iniciar: luna nueva',                     'WhWc3b3KhnY', 465),

  ('arcanos-menores', 1, 1, 'El palo de Bastos, carta por carta',                  'WhWc3b3KhnY', 465),
  ('arcanos-menores', 1, 2, 'Leer una tirada solo con Bastos',                     'YE7VzlLtp-4', 597),
  ('arcanos-menores', 2, 1, 'El palo de Copas: el mapa emocional',                 'TLkA0RELQ1g', 655),
  ('arcanos-menores', 2, 2, 'El palo de Espadas: el mapa mental',                  'eRsGyueVLvQ', 888),
  ('arcanos-menores', 3, 1, 'El palo de Oros: el cuerpo y el sostén',              'R6MlUcmOul8', 735),
  ('arcanos-menores', 3, 2, 'Integrar los cuatro palos en una consulta',           'WhWc3b3KhnY', 465),

  ('reiki-nivel-3', 1, 1, 'De practicante a maestra: qué implica',                 'WhWc3b3KhnY', 465),
  ('reiki-nivel-3', 1, 2, 'Responsabilidad del canal en nivel III',                'YE7VzlLtp-4', 597),
  ('reiki-nivel-3', 2, 1, 'El símbolo de maestría: estudio',                       'TLkA0RELQ1g', 655),
  ('reiki-nivel-3', 2, 2, 'Sostener el símbolo en la práctica diaria',             'eRsGyueVLvQ', 888),
  ('reiki-nivel-3', 3, 1, 'Cómo se sintoniza a otra persona',                      'R6MlUcmOul8', 735),
  ('reiki-nivel-3', 3, 2, 'Ética de enseñar lo que se recibió',                    'WhWc3b3KhnY', 465),

  ('doce-casas', 1, 1, 'Casa I y VII: quién soy, con quién me encuentro',          'WhWc3b3KhnY', 465),
  ('doce-casas', 1, 2, 'Casa IV y X: la raíz y la vocación',                       'YE7VzlLtp-4', 597),
  ('doce-casas', 2, 1, 'Casa II y VIII: lo mío y lo compartido',                   'TLkA0RELQ1g', 655),
  ('doce-casas', 2, 2, 'Casa V y XI: crear y pertenecer',                          'eRsGyueVLvQ', 888),
  ('doce-casas', 3, 1, 'Casa III, VI, IX: aprender, servir, buscar sentido',       'R6MlUcmOul8', 735),
  ('doce-casas', 3, 2, 'Casa XII: lo que se disuelve',                            'WhWc3b3KhnY', 465),

  ('tinturas-iniciales', 1, 1, 'Qué es una tintura madre y para qué sirve',        'WhWc3b3KhnY', 465),
  ('tinturas-iniciales', 1, 2, 'El alcohol como solvente: grados y usos',          'YE7VzlLtp-4', 597),
  ('tinturas-iniciales', 2, 1, 'Proporciones planta-alcohol según la parte usada', 'TLkA0RELQ1g', 655),
  ('tinturas-iniciales', 2, 2, 'Plantas frescas vs. plantas secas',                'eRsGyueVLvQ', 888),
  ('tinturas-iniciales', 3, 1, 'El momento de macerar: intención y contexto',      'R6MlUcmOul8', 735),
  ('tinturas-iniciales', 3, 2, 'Colado, etiquetado y conservación',                'WhWc3b3KhnY', 465)
) as v(slug, module_position, position, title, video_id, duration_seconds)
  on v.slug = modulos.slug and v.module_position = modulos.module_position;

-- ============================================================================================
-- T-017 · criterio 3 -- 3 alumnas con progreso DISTINTO entre si (recien empezada / a la mitad /
-- curso completo). Sin esto no se ven los estados del panel ni del curriculum -- son justo los
-- que se rompen sin que nadie lo note.
--
-- `granted_by` queda NULL a proposito: no hay un admin fijo garantizado en todo ambiente donde
-- corra este seed (el `admin@test.local` que existe hoy en el stack local es un fixture de
-- OTRO ticket -- T-001/T-008 -- y este seed no debe depender de que siga ahi). `granted_by` es
-- nullable por diseño (0001) para exactamente este caso.

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  ('b0000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'iris.recien-empezada@seed.humano.local',
   crypt('seed-student-1234', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Iris Ferreyra"}'::jsonb,
   now(), now(), '', '', '', ''),
  ('b0000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'bruno.a-la-mitad@seed.humano.local',
   crypt('seed-student-1234', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Bruno Sasía"}'::jsonb,
   now(), now(), '', '', '', ''),
  ('b0000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'delfina.curso-completo@seed.humano.local',
   crypt('seed-student-1234', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Delfina Roldán"}'::jsonb,
   now(), now(), '', '', '', '')
on conflict (id) do nothing;

update public.profiles set full_name = v.full_name
from (values
  ('b0000000-0000-4000-8000-000000000001'::uuid, 'Iris Ferreyra'),
  ('b0000000-0000-4000-8000-000000000002'::uuid, 'Bruno Sasía'),
  ('b0000000-0000-4000-8000-000000000003'::uuid, 'Delfina Roldán')
) as v(id, full_name)
where public.profiles.id = v.id and public.profiles.role = 'student';

-- Inscripciones. Idempotente via UNIQUE(user_id, course_id) -- este si sirve de arbiter porque
-- no es deferrable.
insert into public.enrollments (user_id, course_id, status, granted_by)
select v.user_id, c.id, 'active', null
from (values
  ('b0000000-0000-4000-8000-000000000001'::uuid, 'carta-natal-esencial'),
  ('b0000000-0000-4000-8000-000000000002'::uuid, 'tarot-iniciatico'),
  ('b0000000-0000-4000-8000-000000000003'::uuid, 'reiki-nivel-1')
) as v(user_id, slug)
join public.courses c on c.slug = v.slug
on conflict (user_id, course_id) do update set status = excluded.status;

-- El progreso, en su propia transaccion interna acotada: `session_replication_role = replica`
-- deshabilita los triggers `guard_lesson_progress*` (T-015, 0009) para poder escribir el valor
-- FINAL en el INSERT sin que el tope de reloj lo recorte a 10 (ver el porque completo en la
-- cabecera del archivo). Los CHECK de la tabla (`completed = (completed_at is not null)`, 0001)
-- NO se deshabilitan con esto -- por eso completed/completed_at se escriben a mano, coherentes.
set session_replication_role = replica;

-- Iris "recien empezada": 1 sola leccion, bien por debajo del umbral del 90% (criterio 3).
insert into public.lesson_progress (user_id, course_id, lesson_id, seconds_watched, completed, completed_at, last_seen_at)
select
  'b0000000-0000-4000-8000-000000000001', l.course_id, l.id, 45, false, null, now()
from public.lessons l
join public.course_modules cm on cm.id = l.module_id
join public.courses c on c.id = l.course_id
where c.slug = 'carta-natal-esencial' and cm.position = 1 and l.position = 1
on conflict (user_id, lesson_id) do update set
  seconds_watched = excluded.seconds_watched, completed = excluded.completed,
  completed_at = excluded.completed_at, last_seen_at = excluded.last_seen_at;

-- Bruno "a la mitad": 3 de 7 lecciones completadas (>=90%, seconds_watched = duration-1) mas una
-- en curso (por debajo del umbral) -- deja ver el estado "completada / en curso / pendiente" a
-- la vez (T-004 c.5), no solo un corte limpio.
insert into public.lesson_progress (user_id, course_id, lesson_id, seconds_watched, completed, completed_at, last_seen_at)
select 'b0000000-0000-4000-8000-000000000002', l.course_id, l.id,
  case when v.estado = 'completa' then l.duration_seconds - 1 else v.segundos end,
  (v.estado = 'completa'),
  case when v.estado = 'completa' then now() else null end,
  now()
from public.lessons l
join public.course_modules cm on cm.id = l.module_id
join public.courses c on c.id = l.course_id
join (values
  (3, 1, 'completa', 0),
  (3, 2, 'completa', 0),
  (3, 3, 'completa', 0),
  (3, 4, 'en curso', 200)
) as v(module_position, lesson_position, estado, segundos)
  on v.module_position = cm.position and v.lesson_position = l.position
where c.slug = 'tarot-iniciatico'
on conflict (user_id, lesson_id) do update set
  seconds_watched = excluded.seconds_watched, completed = excluded.completed,
  completed_at = excluded.completed_at, last_seen_at = excluded.last_seen_at;

-- Delfina "curso completo": las 6 lecciones de reiki-nivel-1 completadas.
insert into public.lesson_progress (user_id, course_id, lesson_id, seconds_watched, completed, completed_at, last_seen_at)
select 'b0000000-0000-4000-8000-000000000003', l.course_id, l.id, l.duration_seconds - 1, true, now(), now()
from public.lessons l
join public.courses c on c.id = l.course_id
where c.slug = 'reiki-nivel-1'
on conflict (user_id, lesson_id) do update set
  seconds_watched = excluded.seconds_watched, completed = excluded.completed,
  completed_at = excluded.completed_at, last_seen_at = excluded.last_seen_at;

reset session_replication_role;

-- ============================================================================================
-- T-021 · Campus — pedido explicito del PO: "un hilo vacio en cada curso se lee como abandono,
-- no como espacio nuevo". 10 alumnas NUEVAS (no las 3 de T-017 -- esas ya tienen su rol en el
-- panel/progreso y mezclarlas hubiera atado dos seeds que deben poder evolucionar separado),
-- cada una con inscripcion ACTIVA en el curso cuyo hilo comenta (si no, RLS la rechaza -- ver
-- 0014 y `tests/campus-posts.test.mjs`) y una entrada escrita en primera persona sobre el
-- CONTENIDO real de ese modulo/curso, no relleno generico. Repartidas en 7 de los 9 cursos y
-- las 3 disciplinas con docente propia (astrologia, tarot, reiki, herbal) -- ninguna concentra
-- todo en tarot-iniciatico. Las docentes YA EXISTENTES (Luna Arce, Sol Mayor, Aurora Violeta,
-- sembradas mas arriba) responden en varios de esos hilos: no es un foro con una sola voz.
-- Ademas, un puñado de mensajes en el hilo GENERAL (course_id null): dos alumnas nuevas se
-- presentan y una docente da la bienvenida -- el hilo general tambien arranca habitado.
--
-- Idempotente como el resto del archivo: `auth.users`/`enrollments` con su ON CONFLICT natural,
-- `campus_posts` con ID FIJO propio de este seed (namespace 'd0000000-...') y
-- ON CONFLICT (id) DO UPDATE -- no hay otra clave natural en la tabla (no es un dato que el
-- USUARIO edite en produccion, es contenido de arranque). El guard trigger de 0014
-- (`campus_posts_guard`) no interfiere: corre como `postgres`, que `is_service_context()`
-- reconoce como contexto de servicio y deja pasar.

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  ('c0000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'antonella.guzman@seed.humano.local',
   crypt('seed-student-1234', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Antonella Guzmán"}'::jsonb,
   now(), now(), '', '', '', ''),
  ('c0000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'rocio.beltran@seed.humano.local',
   crypt('seed-student-1234', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Rocío Beltrán"}'::jsonb,
   now(), now(), '', '', '', ''),
  ('c0000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'nazarena.ibarra@seed.humano.local',
   crypt('seed-student-1234', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Nazarena Ibarra"}'::jsonb,
   now(), now(), '', '', '', ''),
  ('c0000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'yamila.cortez@seed.humano.local',
   crypt('seed-student-1234', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Yamila Cortez"}'::jsonb,
   now(), now(), '', '', '', ''),
  ('c0000000-0000-4000-8000-000000000005', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'ezequiel.prado@seed.humano.local',
   crypt('seed-student-1234', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Ezequiel Prado"}'::jsonb,
   now(), now(), '', '', '', ''),
  ('c0000000-0000-4000-8000-000000000006', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'milagros.sosa@seed.humano.local',
   crypt('seed-student-1234', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Milagros Sosa"}'::jsonb,
   now(), now(), '', '', '', ''),
  ('c0000000-0000-4000-8000-000000000007', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'agustina.vera@seed.humano.local',
   crypt('seed-student-1234', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Agustina Vera"}'::jsonb,
   now(), now(), '', '', '', ''),
  ('c0000000-0000-4000-8000-000000000008', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'tomas.aguirre@seed.humano.local',
   crypt('seed-student-1234', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Tomás Aguirre"}'::jsonb,
   now(), now(), '', '', '', ''),
  ('c0000000-0000-4000-8000-000000000009', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'florencia.nunez@seed.humano.local',
   crypt('seed-student-1234', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Florencia Núñez"}'::jsonb,
   now(), now(), '', '', '', ''),
  ('c0000000-0000-4000-8000-000000000010', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'ignacio.bazan@seed.humano.local',
   crypt('seed-student-1234', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Ignacio Bazán"}'::jsonb,
   now(), now(), '', '', '', '')
on conflict (id) do nothing;

update public.profiles set full_name = v.full_name
from (values
  ('c0000000-0000-4000-8000-000000000001'::uuid, 'Antonella Guzmán'),
  ('c0000000-0000-4000-8000-000000000002'::uuid, 'Rocío Beltrán'),
  ('c0000000-0000-4000-8000-000000000003'::uuid, 'Nazarena Ibarra'),
  ('c0000000-0000-4000-8000-000000000004'::uuid, 'Yamila Cortez'),
  ('c0000000-0000-4000-8000-000000000005'::uuid, 'Ezequiel Prado'),
  ('c0000000-0000-4000-8000-000000000006'::uuid, 'Milagros Sosa'),
  ('c0000000-0000-4000-8000-000000000007'::uuid, 'Agustina Vera'),
  ('c0000000-0000-4000-8000-000000000008'::uuid, 'Tomás Aguirre'),
  ('c0000000-0000-4000-8000-000000000009'::uuid, 'Florencia Núñez'),
  ('c0000000-0000-4000-8000-000000000010'::uuid, 'Ignacio Bazán')
) as v(id, full_name)
where public.profiles.id = v.id and public.profiles.role = 'student';

-- Inscripcion ACTIVA de cada alumna nueva en el curso cuyo hilo comenta. Sin esto la RLS de
-- 0014 (`can_write_campus_post`) la rechaza -- que es exactamente el comportamiento que
-- `tests/campus-posts.test.mjs` y `harness/b1-postgrest-attacks.sh` verifican por separado.
insert into public.enrollments (user_id, course_id, status, granted_by)
select v.user_id, c.id, 'active', null
from (values
  ('c0000000-0000-4000-8000-000000000001'::uuid, 'carta-natal-esencial'),
  ('c0000000-0000-4000-8000-000000000002'::uuid, 'carta-natal-esencial'),
  ('c0000000-0000-4000-8000-000000000003'::uuid, 'transitos-retornos'),
  ('c0000000-0000-4000-8000-000000000004'::uuid, 'tarot-iniciatico'),
  ('c0000000-0000-4000-8000-000000000005'::uuid, 'tarot-iniciatico'),
  ('c0000000-0000-4000-8000-000000000006'::uuid, 'arcanos-menores'),
  ('c0000000-0000-4000-8000-000000000007'::uuid, 'reiki-nivel-1'),
  ('c0000000-0000-4000-8000-000000000008'::uuid, 'reiki-nivel-1'),
  ('c0000000-0000-4000-8000-000000000009'::uuid, 'herbario-lunar'),
  ('c0000000-0000-4000-8000-000000000010'::uuid, 'tinturas-iniciales')
) as v(user_id, slug)
join public.courses c on c.slug = v.slug
on conflict (user_id, course_id) do update set status = excluded.status;

-- Las entradas de las alumnas, en el hilo de SU curso. `created_at`/`updated_at` escalonados
-- (no `now()` para las 10 iguales) para que el feed tenga un orden legible; se fijan iguales
-- entre si para que no aparezcan como "editadas" sin haberlo sido.
insert into public.campus_posts (id, course_id, author_id, body, created_at, updated_at)
select v.id, c.id, v.author_id, v.body, v.at, v.at
from (values
  ('d0000000-0000-4000-8000-000000000001'::uuid, 'carta-natal-esencial',
   'c0000000-0000-4000-8000-000000000001'::uuid,
   'En mi carta la Casa X está vacía — ningún planeta ahí. En la clase de esta semana quedé con la duda: ¿"vacía" significa que no hay vocación clara, o hay que mirar el regente igual?',
   timestamptz '2026-08-03 09:12:00'),
  ('d0000000-0000-4000-8000-000000000002'::uuid, 'carta-natal-esencial',
   'c0000000-0000-4000-8000-000000000002'::uuid,
   'Tengo Luna en cuadratura con Saturno y durante años pensé que "no podía sentir". Recién ahora, con el módulo de aspectos, entiendo que no era eso — era otra cosa. Gracias por poner nombre a algo que cargué sin entender.',
   timestamptz '2026-08-04 20:47:00'),
  ('d0000000-0000-4000-8000-000000000003'::uuid, 'transitos-retornos',
   'c0000000-0000-4000-8000-000000000003'::uuid,
   '¿Cómo distingo un tránsito de Saturno real de simplemente estar pasando un mal año? Hace tres meses siento que todo pesa el doble y no sé si es el cielo o soy yo.',
   timestamptz '2026-08-05 08:30:00'),
  ('d0000000-0000-4000-8000-000000000004'::uuid, 'tarot-iniciatico',
   'c0000000-0000-4000-8000-000000000004'::uuid,
   'Llevo tres tiradas seguidas donde sale la Torre. Sé que no hay que leerlo como catástrofe pero cuesta no asustarse. ¿Cómo lo sostienen ustedes cuando una carta insiste?',
   timestamptz '2026-08-02 19:05:00'),
  ('d0000000-0000-4000-8000-000000000005'::uuid, 'tarot-iniciatico',
   'c0000000-0000-4000-8000-000000000005'::uuid,
   'Pregunta práctica: ¿se puede leer el propio tarot con honestidad, o siempre termina uno viendo lo que quiere ver? Vengo intentando y no confío en mis propias tiradas.',
   timestamptz '2026-08-06 11:22:00'),
  ('d0000000-0000-4000-8000-000000000006'::uuid, 'arcanos-menores',
   'c0000000-0000-4000-8000-000000000006'::uuid,
   'En el módulo de Espadas vs. Bastos me cuesta distinguirlos en una tirada de conflicto — los dos parecen "tensión". ¿Hay alguna pregunta que ayude a diferenciarlos rápido?',
   timestamptz '2026-08-07 16:40:00'),
  ('d0000000-0000-4000-8000-000000000007'::uuid, 'reiki-nivel-1',
   'c0000000-0000-4000-8000-000000000007'::uuid,
   'Durante la práctica de manos sentí calor en algunas zonas y en otras nada. ¿Es normal esa diferencia o quiere decir que hice algo mal?',
   timestamptz '2026-08-03 18:15:00'),
  ('d0000000-0000-4000-8000-000000000008'::uuid, 'reiki-nivel-1',
   'c0000000-0000-4000-8000-000000000008'::uuid,
   '¿El reiki a distancia se ve en este nivel o recién en nivel III? Pregunto porque tengo a alguien lejos a quien me gustaría acompañar.',
   timestamptz '2026-08-06 09:50:00'),
  ('d0000000-0000-4000-8000-000000000009'::uuid, 'herbario-lunar',
   'c0000000-0000-4000-8000-000000000009'::uuid,
   'Estoy en el hemisferio sur y las fases que da el módulo suenan pensadas para el hemisferio norte, ¿no? ¿Cambia algo la cosecha si acá la estación está invertida?',
   timestamptz '2026-08-04 14:00:00'),
  ('d0000000-0000-4000-8000-000000000010'::uuid, 'tinturas-iniciales',
   'c0000000-0000-4000-8000-000000000010'::uuid,
   'En casa solo consigo alcohol de caña de 40°. El módulo pide 70° para la maceración — ¿sirve igual o cambia demasiado el resultado final?',
   timestamptz '2026-08-05 15:33:00')
) as v(id, slug, author_id, body, at)
join public.courses c on c.slug = v.slug
on conflict (id) do update set body = excluded.body, updated_at = excluded.updated_at;

-- Respuestas de las TRES docentes ya existentes, en varios (no todos) de esos hilos.
with teachers as (
  select id, full_name from public.profiles
  where full_name in ('Luna Arce', 'Sol Mayor', 'Aurora Violeta')
)
insert into public.campus_posts (id, course_id, author_id, body, created_at, updated_at)
select v.id, c.id, t.id, v.body, v.at, v.at
from (values
  ('d0000000-0000-4000-8000-000000000101'::uuid, 'carta-natal-esencial', 'Luna Arce',
   'Vacía nunca es "sin nada": mirá dónde está el regente de la Casa X y qué aspectos recibe — la vocación se lee ahí, no en la casilla sola. Lo vemos con ejemplos reales en el módulo III.',
   timestamptz '2026-08-03 21:40:00'),
  ('d0000000-0000-4000-8000-000000000102'::uuid, 'transitos-retornos', 'Luna Arce',
   'Las dos cosas son ciertas a la vez, y esa es justamente la pregunta que abre el módulo III: un tránsito no reemplaza tu historia, la atraviesa. Traé tu carta a la próxima clase si querés que lo miremos juntas.',
   timestamptz '2026-08-05 20:10:00'),
  ('d0000000-0000-4000-8000-000000000103'::uuid, 'tarot-iniciatico', 'Sol Mayor',
   'Cuando una carta insiste, no está anunciando un desastre — está pidiendo que dejes de esquivar algo que ya sabés. La Torre tres veces no es "más Torre": es la misma pregunta que todavía no contestaste. Lo hablamos en el círculo del jueves.',
   timestamptz '2026-08-03 08:05:00'),
  ('d0000000-0000-4000-8000-000000000104'::uuid, 'arcanos-menores', 'Sol Mayor',
   'Preguntate si el conflicto vive en la cabeza (Espadas) o en la voluntad (Bastos): uno pelea con argumentos, el otro con impulso. La mayoría de las consultas mezclan los dos palos — el trabajo es ver cuál domina en ESTA tirada.',
   timestamptz '2026-08-08 10:12:00'),
  ('d0000000-0000-4000-8000-000000000105'::uuid, 'reiki-nivel-1', 'Aurora Violeta',
   'Es normal, y es información, no error: donde todavía no sentís nada, sostené la misma calma — la sensación no es el objetivo, es un efecto secundario que aparece con el tiempo. Seguí sin apurar.',
   timestamptz '2026-08-04 07:55:00'),
  ('d0000000-0000-4000-8000-000000000106'::uuid, 'herbario-lunar', 'Aurora Violeta',
   'La fase lunar es la misma en los dos hemisferios — lo que se invierte es la estación, no la luna. Para vos eso significa: mirá qué planta tenés disponible en TU otoño, no en el ejemplo del módulo, y aplicá la misma lógica de fase sobre lo que sí está creciendo ahí.',
   timestamptz '2026-08-05 09:20:00')
) as v(id, slug, teacher_name, body, at)
join public.courses c on c.slug = v.slug
join teachers t on t.full_name = v.teacher_name
on conflict (id) do update set body = excluded.body, updated_at = excluded.updated_at;

-- El hilo GENERAL (course_id null): dos presentaciones y una bienvenida de docente, para que
-- tampoco arranque vacío. No exige inscripcion (0014, criterio 4) -- cualquiera con sesion.
with teachers as (
  select id, full_name from public.profiles
  where full_name in ('Luna Arce', 'Sol Mayor', 'Aurora Violeta')
)
insert into public.campus_posts (id, course_id, author_id, body, created_at, updated_at)
select v.id, null, coalesce(t.id, v.author_id), v.body, v.at, v.at
from (values
  ('d0000000-0000-4000-8000-000000000201'::uuid,
   'c0000000-0000-4000-8000-000000000001'::uuid, null::text,
   'Hola a todas, soy nueva en el Campus — vengo de Rosario, llegué buscando entender mi carta natal y me quedé por la comunidad.',
   timestamptz '2026-08-03 09:00:00'),
  ('d0000000-0000-4000-8000-000000000202'::uuid,
   'c0000000-0000-4000-8000-000000000010'::uuid, null::text,
   '¿Alguien más está cursando dos cosas a la vez? Estoy con tinturas y reiki y no sé bien cómo organizar el tiempo entre las dos.',
   timestamptz '2026-08-05 15:20:00'),
  ('d0000000-0000-4000-8000-000000000203'::uuid, null::uuid, 'Sol Mayor',
   'Bienvenidas a las que llegaron esta semana. El Campus es lento a propósito: no hace falta escribir todos los días para pertenecer.',
   timestamptz '2026-08-06 12:00:00')
) as v(id, author_id, teacher_name, body, at)
left join teachers t on t.full_name = v.teacher_name
on conflict (id) do update set body = excluded.body, updated_at = excluded.updated_at;

commit;
