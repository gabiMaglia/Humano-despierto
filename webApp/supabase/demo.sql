-- Datos de demo para recorrer la app (reunion con la clienta).
--
-- Corre DESPUES de seed.sql (necesita los 9 cursos publicados, sus lecciones y las 3 docentes).
-- Solo para base local: crea cuentas con contrasena conocida. No va a produccion.
--
--   docker exec -i supabase_db_webApp psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f /dev/stdin < webApp/supabase/demo.sql
--
-- Cuentas (contrasena de las dos primeras: demo-humano-2026):
--   alumna@demo.humano  · Camila Ferreyra · student
--   admin@demo.humano   · Admin Humano    · admin
--   sol.mayor@seed.humano.local / seed-teacher-1234 · docente (Sol Mayor, del seed; no se duplica)
--
-- Idempotente: UUID fijos propios (prefijo `de`), claves naturales y ON CONFLICT. Correrlo dos
-- veces converge. No borra nada. El progreso se escribe con session_replication_role = replica
-- por el mismo motivo que seed.sql (tope de reloj de 0009 / T-015): fuera de ese bloque ningun
-- trigger se desactiva. completed/completed_at se escriben coherentes a mano.
-- reiki-nivel-3 queda sin inscriptas ni resenas a proposito: muestra el estado "Curso nuevo".

begin;

-- ---------------------------------------------------------------- helper de lecciones
-- n-esima leccion publicada del curso, en orden de modulo y posicion.
create or replace function pg_temp.lid(p_slug text, p_n int) returns uuid
language sql stable as $$
  select x.id from (
    select l.id, row_number() over (order by m.position, l.position) n
    from public.lessons l
    join public.course_modules m on m.id = l.module_id
    join public.courses c on c.id = l.course_id
    where c.slug = p_slug and l.is_published
  ) x where x.n = p_n
$$;

-- ---------------------------------------------------------------- cuentas
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select v.id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       v.email, crypt(v.pwd, gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       jsonb_build_object('full_name', v.full_name),
       now() - interval '60 days', now(), '', '', '', ''
from (values
  ('de000000-0000-4000-8000-000000000001', 'alumna@demo.humano',    'Camila Ferreyra',   'demo-humano-2026'),
  ('de000000-0000-4000-8000-000000000002', 'admin@demo.humano',     'Admin Humano',      'demo-humano-2026'),
  ('de000000-0000-4000-8000-000000000011', 'lucia@demo.humano',     'Lucía Benítez',     'demo-humano-2026'),
  ('de000000-0000-4000-8000-000000000012', 'martina@demo.humano',   'Martina Olivera',   'demo-humano-2026'),
  ('de000000-0000-4000-8000-000000000013', 'julieta@demo.humano',   'Julieta Sosa',      'demo-humano-2026'),
  ('de000000-0000-4000-8000-000000000014', 'agustina@demo.humano',  'Agustina Paredes',  'demo-humano-2026'),
  ('de000000-0000-4000-8000-000000000015', 'florencia@demo.humano', 'Florencia Quiroga', 'demo-humano-2026'),
  ('de000000-0000-4000-8000-000000000016', 'paula@demo.humano',     'Paula Domínguez',   'demo-humano-2026'),
  ('de000000-0000-4000-8000-000000000017', 'romina@demo.humano',    'Romina Acosta',     'demo-humano-2026'),
  ('de000000-0000-4000-8000-000000000018', 'valentina@demo.humano', 'Valentina Ríos',    'demo-humano-2026'),
  ('de000000-0000-4000-8000-000000000019', 'sofia@demo.humano',     'Sofía Giménez',     'demo-humano-2026'),
  ('de000000-0000-4000-8000-000000000020', 'micaela@demo.humano',   'Micaela Torres',    'demo-humano-2026'),
  ('de000000-0000-4000-8000-000000000021', 'matias@demo.humano',    'Matías Herrera',    'demo-humano-2026'),
  ('de000000-0000-4000-8000-000000000022', 'tomas@demo.humano',     'Tomás Aguirre',     'demo-humano-2026')
) as v(id, email, full_name, pwd)
on conflict (id) do nothing;

update public.profiles p set full_name = u.raw_user_meta_data ->> 'full_name'
from auth.users u
where u.id = p.id and u.email like '%@demo.humano'
  and p.full_name is distinct from (u.raw_user_meta_data ->> 'full_name');

update public.profiles set role = 'admin'
where id = 'de000000-0000-4000-8000-000000000002' and role <> 'admin';

-- ---------------------------------------------------------------- matriz de inscripciones
create temp table demo_enr (email text, slug text, done int, days int) on commit drop;
insert into demo_enr values
  ('alumna@demo.humano',    'carta-natal-esencial', 6, 45),
  ('alumna@demo.humano',    'tarot-iniciatico',     3, 30),
  ('alumna@demo.humano',    'herbario-lunar',       1,  6),
  ('lucia@demo.humano',     'carta-natal-esencial', 6, 50),
  ('lucia@demo.humano',     'transitos-retornos',   3, 20),
  ('martina@demo.humano',   'carta-natal-esencial', 4, 35),
  ('martina@demo.humano',   'reiki-nivel-1',        6, 40),
  ('julieta@demo.humano',   'carta-natal-esencial', 2, 25),
  ('julieta@demo.humano',   'transitos-retornos',   1, 12),
  ('julieta@demo.humano',   'herbario-lunar',       3, 28),
  ('agustina@demo.humano',  'carta-natal-esencial', 5, 38),
  ('agustina@demo.humano',  'tarot-iniciatico',     2, 18),
  ('agustina@demo.humano',  'tinturas-iniciales',   6, 55),
  ('florencia@demo.humano', 'doce-casas',           3, 22),
  ('florencia@demo.humano', 'tarot-iniciatico',     1, 10),
  ('florencia@demo.humano', 'reiki-nivel-1',        6, 42),
  ('paula@demo.humano',     'doce-casas',           6, 48),
  ('paula@demo.humano',     'arcanos-menores',      2, 15),
  ('paula@demo.humano',     'reiki-nivel-1',        4, 33),
  ('romina@demo.humano',    'doce-casas',           2, 14),
  ('romina@demo.humano',    'arcanos-menores',      6, 44),
  ('romina@demo.humano',    'reiki-nivel-1',        3, 27),
  ('valentina@demo.humano', 'transitos-retornos',   4, 30),
  ('valentina@demo.humano', 'herbario-lunar',       5, 32),
  ('valentina@demo.humano', 'tinturas-iniciales',   1,  8),
  ('sofia@demo.humano',     'transitos-retornos',   6, 46),
  ('sofia@demo.humano',     'tarot-iniciatico',     4, 24),
  ('sofia@demo.humano',     'tinturas-iniciales',   2, 16),
  ('micaela@demo.humano',   'tarot-iniciatico',     7, 52),
  ('micaela@demo.humano',   'arcanos-menores',      3, 21),
  ('micaela@demo.humano',   'herbario-lunar',       2, 11),
  ('matias@demo.humano',    'doce-casas',           5, 37),
  ('matias@demo.humano',    'herbario-lunar',       6, 41),
  ('matias@demo.humano',    'tinturas-iniciales',   3, 19),
  ('tomas@demo.humano',     'tarot-iniciatico',     5, 36),
  ('tomas@demo.humano',     'arcanos-menores',      6, 34),
  ('tomas@demo.humano',     'reiki-nivel-1',        2, 13);

insert into public.enrollments (user_id, course_id, status, granted_by, enrolled_at)
select u.id, c.id, 'active', 'de000000-0000-4000-8000-000000000002', now() - make_interval(days => d.days)
from demo_enr d
join auth.users u on u.email = d.email
join public.courses c on c.slug = d.slug
on conflict (user_id, course_id) do update set status = 'active';

-- Cola del admin: solicitudes pendientes de distintas alumnas.
insert into public.enrollments (user_id, course_id, status, requested_at, enrolled_at)
select u.id, c.id, 'requested', now() - make_interval(days => v.days), now() - make_interval(days => v.days)
from (values
  ('alumna@demo.humano',  'reiki-nivel-1',      1),
  ('martina@demo.humano', 'doce-casas',         2),
  ('matias@demo.humano',  'transitos-retornos', 3),
  ('florencia@demo.humano', 'arcanos-menores',  4)
) as v(email, slug, days)
join auth.users u on u.email = v.email
join public.courses c on c.slug = v.slug
on conflict (user_id, course_id) do nothing;

-- ---------------------------------------------------------------- progreso
set local session_replication_role = replica;

with ord as (
  select l.id lesson_id, l.course_id, l.duration_seconds dur,
         row_number() over (partition by l.course_id order by m.position, l.position) n
  from public.lessons l
  join public.course_modules m on m.id = l.module_id
  where l.is_published
), src as (
  select u.id uid, o.course_id, o.lesson_id, o.dur, o.n, d.done, d.days
  from demo_enr d
  join auth.users u on u.email = d.email
  join public.courses c on c.slug = d.slug
  join ord o on o.course_id = c.id
  where o.n <= d.done + 1
)
insert into public.lesson_progress (user_id, course_id, lesson_id, seconds_watched, completed, completed_at, last_seen_at)
select uid, course_id, lesson_id,
       case when n <= done then dur else (dur * 0.35)::int end,
       n <= done,
       case when n <= done then now() - make_interval(days => (days - n)::int) end,
       case when n <= done then now() - make_interval(days => (days - n)::int) else now() - interval '2 days' end
from src
on conflict (user_id, lesson_id) do update set
  seconds_watched = excluded.seconds_watched, completed = excluded.completed,
  completed_at = excluded.completed_at, last_seen_at = excluded.last_seen_at;

reset session_replication_role;

-- Certificado de Camila (el trigger deriva nombre, titulo, docente, fecha y codigo).
insert into public.certificates (user_id, course_id, student_name, course_title, teacher_name, completed_at)
select u.id, c.id, '-', '-', '-', now()
from auth.users u, public.courses c
where u.email = 'alumna@demo.humano' and c.slug = 'carta-natal-esencial'
on conflict (user_id, course_id) do nothing;

-- ---------------------------------------------------------------- wishlist
insert into public.course_wishlist (user_id, course_id)
select u.id, c.id
from auth.users u, public.courses c
where u.email = 'alumna@demo.humano' and c.slug in ('doce-casas', 'reiki-nivel-3')
on conflict do nothing;

-- ---------------------------------------------------------------- notas de Camila
insert into public.lesson_notes (id, user_id, course_id, lesson_id, at_seconds, body)
select v.id::uuid, u.id, c.id, pg_temp.lid(v.slug, v.n), v.at_seconds, v.body
from (values
  ('de300000-0000-4000-8000-000000000001', 'tarot-iniciatico', 1, 84,
   'Antes de dar vuelta la primera carta: una pregunta abierta, sin "sí o no". Probar con "qué necesito ver de esto".'),
  ('de300000-0000-4000-8000-000000000002', 'tarot-iniciatico', 2, 210,
   'Lo oculto no es lo que la carta esconde, es lo que yo todavía no quiero nombrar. Releer esta parte.'),
  ('de300000-0000-4000-8000-000000000003', 'tarot-iniciatico', 3, 330,
   'El consejo va en presente, no en futuro. Sol lo repite tres veces: anotarlo en la tapa del cuaderno.'),
  ('de300000-0000-4000-8000-000000000004', 'carta-natal-esencial', 2, 150,
   'Sol en casa 6, Luna en casa 10: trabajo cotidiano muy expuesto. Ver cómo lo aspecta Saturno.'),
  ('de300000-0000-4000-8000-000000000005', 'carta-natal-esencial', 4, 400,
   'Los aspectos no se leen de a uno. Primero el tono general de la carta, después el detalle.')
) as v(id, slug, n, at_seconds, body)
join auth.users u on u.email = 'alumna@demo.humano'
join public.courses c on c.slug = v.slug
on conflict (id) do nothing;

-- ---------------------------------------------------------------- Q&A
insert into public.lesson_questions (id, lesson_id, course_id, author_id, title, body, resolved_at, resolved_by, created_at)
select v.id::uuid, pg_temp.lid(v.slug, v.n), c.id, u.id, v.title, v.body,
       case when v.resolved then now() - make_interval(days => v.days - 1) end,
       case when v.resolved then u.id end,
       now() - make_interval(days => v.days)
from (values
  ('de100000-0000-4000-8000-000000000001', 'alumna@demo.humano', 'tarot-iniciatico', 2, 9, true,
   '¿Cómo distingo lo oculto de lo que no quiero ver?',
   'En la tirada de tres cartas, la carta del medio me sale casi siempre incómoda. No sé si es realmente "lo oculto" o si yo la leo con resistencia porque me incomoda lo que dice. ¿Cómo se separa una cosa de la otra?'),
  ('de100000-0000-4000-8000-000000000002', 'alumna@demo.humano', 'herbario-lunar', 1, 3, false,
   'Luna menguante en el hemisferio sur',
   'Vivo en Córdoba y quiero empezar con una huerta de aromáticas en macetas. ¿Conviene sembrar en luna creciente aunque todavía haga frío, o espero a septiembre?'),
  ('de100000-0000-4000-8000-000000000003', 'micaela@demo.humano', 'tarot-iniciatico', 4, 14, true,
   'La Torre invertida, ¿es una caída que no ocurre?',
   'Me salió la Torre invertida en una tirada para una amiga y no supe qué decirle. ¿Es una caída postergada, una caída interna, o simplemente una Torre más suave?'),
  ('de100000-0000-4000-8000-000000000004', 'valentina@demo.humano', 'herbario-lunar', 3, 11, true,
   '¿Puedo secar las hierbas al sol directo?',
   'Cosecho melisa y menta en el balcón. Las dejo secar en la ventana con sol de tarde, pero quedan medio marrones. ¿Estoy arruinando los aceites?'),
  ('de100000-0000-4000-8000-000000000005', 'romina@demo.humano', 'arcanos-menores', 2, 17, true,
   'Dos de Espadas y Dos de Copas en la misma tirada',
   'Salieron juntas en una consulta sobre una relación. Una habla de bloqueo y la otra de encuentro. ¿Las leo como contradicción o como secuencia?'),
  ('de100000-0000-4000-8000-000000000006', 'lucia@demo.humano', 'carta-natal-esencial', 3, 21, true,
   'Mi ascendente cambia según la hora de nacimiento',
   'Tengo dos horas posibles en el acta, con veinte minutos de diferencia, y me dan ascendentes distintos. ¿Con cuál trabajo mientras averiguo cuál es la correcta?'),
  ('de100000-0000-4000-8000-000000000007', 'matias@demo.humano', 'tinturas-iniciales', 2, 5, false,
   'Tiempo de maceración de la caléndula',
   'El módulo habla de cuatro a seis semanas. Si la dejo ocho, ¿se pasa de punto o simplemente queda más concentrada?')
) as v(id, email, slug, n, days, resolved, title, body)
join auth.users u on u.email = v.email
join public.courses c on c.slug = v.slug
on conflict (id) do nothing;

insert into public.lesson_answers (id, question_id, lesson_id, course_id, author_id, body, featured_at, created_at)
select v.id::uuid, v.qid::uuid, q.lesson_id, q.course_id,
       coalesce(t.id, u.id), v.body,
       case when v.featured then now() - make_interval(days => v.days) end,
       now() - make_interval(days => v.days)
from (values
  ('de200000-0000-4000-8000-000000000001', 'de100000-0000-4000-8000-000000000001', 'Sol Mayor', null, true, 8,
   'Probá esto: antes de interpretar, escribí en una línea qué sentiste al darla vuelta. Si la incomodidad aparece antes de entender la imagen, es resistencia tuya. Si aparece después de entenderla, es información de la carta. La del medio casi nunca es amable, y está bien que no lo sea.'),
  ('de200000-0000-4000-8000-000000000002', 'de100000-0000-4000-8000-000000000003', 'Sol Mayor', null, true, 13,
   'Yo la leo como una caída interna: la estructura ya cedió, pero todavía nadie lo dijo en voz alta. Con tu amiga, preguntale qué se sostiene hoy por costumbre y no por convicción.'),
  ('de200000-0000-4000-8000-000000000003', 'de100000-0000-4000-8000-000000000003', null, 'tomas@demo.humano', false, 12,
   'A mí me ayudó mirar la carta de al lado. Si la que sigue es suave, la Torre invertida suele ser alivio. Si es otra de ruptura, es una advertencia.'),
  ('de200000-0000-4000-8000-000000000004', 'de100000-0000-4000-8000-000000000004', 'Aurora Violeta', null, true, 10,
   'Sí, el sol directo se lleva buena parte del aceite esencial. Secalas a la sombra, en un lugar con aire, atadas en ramitos boca abajo. Tardan más, pero conservan el color y el aroma.'),
  ('de200000-0000-4000-8000-000000000005', 'de100000-0000-4000-8000-000000000005', 'Sol Mayor', null, false, 16,
   'Como secuencia. El Dos de Espadas es la puerta cerrada y el Dos de Copas es lo que pasa cuando alguien decide abrirla. Fijate cuál de los dos está más cerca del consultante en la tirada.'),
  ('de200000-0000-4000-8000-000000000006', 'de100000-0000-4000-8000-000000000006', 'Luna Arce', null, true, 20,
   'Trabajá con ambas y mirá qué cambia: si solo se mueven las casas y no los planetas, el cuadro general se sostiene. Para rectificar la hora hace falta además una historia de eventos, que es el tema del módulo cinco.')
) as v(id, qid, teacher_name, student_email, featured, days, body)
join public.lesson_questions q on q.id = v.qid::uuid
left join public.profiles t on t.full_name = v.teacher_name and t.role = 'teacher'
left join auth.users u on u.email = v.student_email
on conflict (id) do nothing;

-- ---------------------------------------------------------------- resenas
create temp table demo_rev (email text, slug text, rating int, days int, body text, response text, teacher text) on commit drop;
insert into demo_rev values
  ('alumna@demo.humano', 'carta-natal-esencial', 5, 12,
   'Empecé sin saber qué era un ascendente y terminé leyendo mi propia carta con calma. Luna no apura: cada módulo deja una pregunta para llevarse. Lo mejor es la forma en que conecta los aspectos con situaciones concretas.', null, null),
  ('lucia@demo.humano', 'carta-natal-esencial', 5, 14,
   'Es un curso para volver a mirar. La parte de las casas me ordenó años de intuiciones sueltas. Y los ejercicios finales son de verdad, no de relleno.',
   'Gracias, Lucía. Qué alegría que las casas hayan acomodado esas intuiciones. Te espero en Tránsitos y retornos.', 'Luna Arce'),
  ('martina@demo.humano', 'carta-natal-esencial', 4, 18,
   'Muy bien explicado y con buen ritmo. Me hubiera gustado un ejemplo más con una carta de hombre, pero el material descargable compensa.', null, null),
  ('agustina@demo.humano', 'carta-natal-esencial', 4, 9,
   'Claro, sobrio y sin misticismo de más. Lo recomiendo si querés una base sólida antes de pasar a técnicas predictivas.', null, null),
  ('paula@demo.humano', 'doce-casas', 5, 20,
   'El recorrido casa por casa tiene una lógica que no había visto en otros cursos. Las lecciones sobre las casas angulares me cambiaron la forma de leer una carta.', null, null),
  ('matias@demo.humano', 'doce-casas', 4, 16,
   'Buen curso, exige haber hecho antes la carta natal esencial. Con esa base se disfruta mucho más.', null, null),
  ('florencia@demo.humano', 'doce-casas', 3, 7,
   'El contenido es bueno pero me costó seguir el ritmo de las últimas casas, van muy rápido. Habría agradecido una lección de repaso.', null, null),
  ('sofia@demo.humano', 'transitos-retornos', 5, 19,
   'El módulo del retorno de Saturno me dio un marco para entender un año difícil. No promete nada: te enseña a observar.', null, null),
  ('valentina@demo.humano', 'transitos-retornos', 4, 10,
   'Me gustó que empiece por el cuerpo y no por el cálculo. Los ejemplos con efemérides son claros. Faltaría algo sobre tránsitos lentos de Plutón.', null, null),
  ('lucia@demo.humano', 'transitos-retornos', 3, 4,
   'Va por la mitad y por ahora es más técnico que el curso anterior. Está bien explicado, pero hay que tener la carta a mano en todo momento.', null, null),
  ('micaela@demo.humano', 'tarot-iniciatico', 5, 22,
   'Sol enseña a mirar la imagen antes que el significado de manual. Después de este curso dejé de buscar en el libro y empecé a mirar la carta.', null, null),
  ('tomas@demo.humano', 'tarot-iniciatico', 4, 15,
   'Muy buena introducción. La lección de la tirada de tres cartas vale por sí sola la inscripción.', null, null),
  ('sofia@demo.humano', 'tarot-iniciatico', 4, 6,
   'Ritmo tranquilo y mucho respeto por el consultante. Me quedó pendiente practicar más la cruz celta, que se presenta recién al final.', null, null),
  ('agustina@demo.humano', 'tarot-iniciatico', 3, 3,
   'Llevo dos lecciones. El primer módulo es lento para quien ya conoce los arcanos mayores. Entiendo que es una base, pero esperaba entrar antes en la práctica.',
   'Gracias por decirlo, Agustina. El primer módulo es lento a propósito, pero el segundo ya entra en la práctica con las tiradas. Contame cómo te va ahí.', 'Sol Mayor'),
  ('tomas@demo.humano', 'arcanos-menores', 5, 11,
   'Por fin un curso que trata a los menores como lo que son: la vida cotidiana de la tirada. Los palos quedaron clarísimos.', null, null),
  ('romina@demo.humano', 'arcanos-menores', 4, 13,
   'Muy útil para consultas concretas. Lo mejor es el módulo de Espadas contra Bastos.', null, null),
  ('micaela@demo.humano', 'arcanos-menores', 4, 5,
   'Excelente complemento de Tarot iniciático. Va a la mitad pero ya cambió cómo leo las cartas numeradas.', null, null),
  ('paula@demo.humano', 'arcanos-menores', 3, 2,
   'Buen material, aunque las dos primeras lecciones repiten bastante de Tarot iniciático. Desde la tercera se pone interesante.', null, null),
  ('matias@demo.humano', 'herbario-lunar', 5, 17,
   'Aurora enseña con las manos en la tierra. Aprendí a cosechar a la hora justa y a secar sin arruinar el aroma. El calendario descargable lo uso todas las semanas.', null, null),
  ('valentina@demo.humano', 'herbario-lunar', 4, 8,
   'Muy lindo curso para el hemisferio sur, con las estaciones bien contempladas. Alguna planta es difícil de conseguir, pero propone alternativas.', null, null),
  ('julieta@demo.humano', 'herbario-lunar', 4, 6,
   'Pausado, claro y hermoso. Se nota que la docente cultiva lo que enseña.', null, null),
  ('martina@demo.humano', 'reiki-nivel-1', 5, 26,
   'Un nivel I que explica la historia, la ética y la práctica sin exagerar nada. Los ejercicios de manos son simples y se sienten.',
   'Gracias, Martina. Esa sencillez es la idea: que el nivel I sea un buen cimiento. Te leo cuando empieces con el nivel II.', 'Aurora Violeta'),
  ('florencia@demo.humano', 'reiki-nivel-1', 5, 24,
   'Lo hice completo y me quedó una práctica diaria de diez minutos que sostengo hace semanas. Es lo más valioso.', null, null),
  ('romina@demo.humano', 'reiki-nivel-1', 4, 8,
   'Muy cuidado. Aunque voy por la mitad, ya puedo hacer la autoaplicación sin mirar el video.', null, null),
  ('paula@demo.humano', 'reiki-nivel-1', 3, 5,
   'Está bien, pero esperaba algo más de guía sobre cómo organizar una sesión con otra persona. Quizás eso viene en el nivel siguiente.', null, null),
  ('agustina@demo.humano', 'tinturas-iniciales', 5, 30,
   'Hice mi primera tintura de caléndula siguiendo el módulo paso a paso y salió perfecta. Las medidas y los tiempos son claros y seguros.', null, null),
  ('matias@demo.humano', 'tinturas-iniciales', 4, 9,
   'Explica por qué se hace cada cosa, no solo cómo. Me hubiera servido una tabla con las graduaciones de alcohol por planta.', null, null),
  ('sofia@demo.humano', 'tinturas-iniciales', 3, 4,
   'Buen contenido pero con poca flexibilidad: asume que se consigue alcohol de 70°, y acá cuesta. La docente respondió en el foro, pero no está en la lección.', null, null);

insert into public.course_reviews (course_id, user_id, rating, body, response, responded_at, responded_by, created_at)
select c.id, u.id, r.rating, r.body, r.response,
       case when r.response is not null then now() - make_interval(days => greatest(r.days - 1, 0)) end,
       t.id,
       now() - make_interval(days => r.days)
from demo_rev r
join auth.users u on u.email = r.email
join public.courses c on c.slug = r.slug
left join public.profiles t on t.full_name = r.teacher and t.role = 'teacher'
where r.response is null or t.id is not null
on conflict (user_id, course_id) do update set
  rating = excluded.rating, body = excluded.body, response = excluded.response,
  responded_at = excluded.responded_at, responded_by = excluded.responded_by;

-- ---------------------------------------------------------------- anuncios
insert into public.course_announcements (id, course_id, author_id, title, body, status, published_at, created_at)
select v.id::uuid, c.id, c.teacher_id, v.title, v.body, 'published',
       now() - make_interval(days => v.days), now() - make_interval(days => v.days)
from (values
  ('de400000-0000-4000-8000-000000000001', 'tarot-iniciatico', 20, 'Nuevo material de práctica',
   'Sumé a la lección de la tirada de tres cartas una plantilla en PDF para que puedan registrar sus lecturas. Les recomiendo usarla durante las dos primeras semanas: escribir lo que sale ayuda a ver los patrones propios.'),
  ('de400000-0000-4000-8000-000000000002', 'tarot-iniciatico', 5, 'Encuentro de preguntas abiertas',
   'Esta semana respondo en el foro de cada lección las dudas acumuladas. Si tienen una tirada que los dejó pensando, cuéntenla ahí con la pregunta que hicieron y las cartas que salieron.'),
  ('de400000-0000-4000-8000-000000000003', 'carta-natal-esencial', 12, 'Una nota sobre la hora de nacimiento',
   'Varias me escribieron preguntando qué hacer si no tienen la hora exacta. Agregué una lección corta con tres alternativas: carta solar, carta lunar y rectificación. Pueden verla desde el módulo tercero.'),
  ('de400000-0000-4000-8000-000000000004', 'herbario-lunar', 18, 'Calendario de cosecha de otoño',
   'Actualicé el calendario lunar descargable con las fechas de la próxima estación en el hemisferio sur. Reemplaza al anterior; conviene descargarlo de nuevo.'),
  ('de400000-0000-4000-8000-000000000005', 'herbario-lunar', 4, 'Qué sembrar ahora',
   'Con el aumento de temperatura es buen momento para empezar albahaca, caléndula y manzanilla en almácigo. En la lección cuatro explico cómo cuidar la primera germinación sin ahogarlas con agua.'),
  ('de400000-0000-4000-8000-000000000006', 'reiki-nivel-1', 10, 'Práctica diaria de diez minutos',
   'Les propongo un ejercicio simple para las próximas dos semanas: la autoaplicación sentada, sin música, al despertar. No hace falta sentir nada especial. La constancia importa más que la intensidad.')
) as v(id, slug, days, title, body)
join public.courses c on c.slug = v.slug
on conflict (id) do nothing;

-- ---------------------------------------------------------------- comunidad
insert into public.campus_posts (id, course_id, author_id, body, created_at, updated_at)
select v.id::uuid, c.id, coalesce(t.id, u.id), v.body,
       now() - make_interval(days => v.days), now() - make_interval(days => v.days)
from (values
  ('de500000-0000-4000-8000-000000000001', 'tarot-iniciatico', 'micaela@demo.humano', null, 13,
   'Terminé el curso. Lo que más me llevo es la costumbre de describir la imagen antes de buscar el significado. Cambia todo.'),
  ('de500000-0000-4000-8000-000000000002', 'tarot-iniciatico', null, 'Sol Mayor', 12,
   'Qué alegría, Micaela. Esa costumbre es el oficio entero. Cuando quieras, sumate a la conversación del nivel siguiente.'),
  ('de500000-0000-4000-8000-000000000003', 'tarot-iniciatico', 'alumna@demo.humano', null, 6,
   'Estoy en la mitad. Anoto cada tirada en un cuaderno con fecha y pregunta. ¿Ustedes también registran las lecturas o confían en la memoria?'),
  ('de500000-0000-4000-8000-000000000004', 'tarot-iniciatico', 'tomas@demo.humano', null, 5,
   'Camila, yo anoto todo. A los dos meses releí las primeras tiradas y vi que muchas cosas que me parecían obvias recién ahora tienen sentido.'),
  ('de500000-0000-4000-8000-000000000005', 'carta-natal-esencial', 'paula@demo.humano', null, 9,
   'Compartan algo: ¿cuál fue la primera casa que les hizo ruido en su carta? A mí la casa ocho me llevó semanas entender.'),
  ('de500000-0000-4000-8000-000000000006', 'carta-natal-esencial', null, 'Luna Arce', 8,
   'Es la casa que más preguntas despierta. Más que de muerte, habla de lo que compartimos y de lo que se transforma en el vínculo. Paula, te propongo mirarla junto con la casa dos.'),
  ('de500000-0000-4000-8000-000000000007', 'herbario-lunar', 'matias@demo.humano', null, 7,
   'Tengo la melisa lista para cosechar. ¿Alguien probó secarla en deshidratador? Quiero comparar con el secado al aire.'),
  ('de500000-0000-4000-8000-000000000008', 'herbario-lunar', null, 'Aurora Violeta', 6,
   'Matías, el deshidratador a baja temperatura, por debajo de 40 grados, conserva bien el aroma. Prueba con la mitad de la cosecha en cada método y comparan.'),
  ('de500000-0000-4000-8000-000000000009', 'reiki-nivel-1', 'martina@demo.humano', null, 15,
   'Hace tres semanas que hago la autoaplicación al despertar. Lo más notorio es que duermo mejor, aunque no sé si es el reiki o simplemente el hábito.'),
  ('de500000-0000-4000-8000-000000000010', 'reiki-nivel-1', null, 'Aurora Violeta', 14,
   'Probablemente las dos cosas, Martina, y no hace falta separarlas. Lo importante es que el hábito te hace bien.'),
  ('de500000-0000-4000-8000-000000000011', 'arcanos-menores', 'romina@demo.humano', null, 4,
   'Dato práctico: ordeno los menores por palo y número en una grilla de cuatro por diez. Ayuda a ver de un vistazo qué falta en una tirada.'),
  ('de500000-0000-4000-8000-000000000012', 'transitos-retornos', 'sofia@demo.humano', null, 3,
   'Estoy en pleno retorno de Saturno. Si alguien lo está pasando, avísenme: me vendría bien charlar con quien lo atraviesa.'),
  ('de500000-0000-4000-8000-000000000013', null, 'valentina@demo.humano', null, 2,
   'Buenas, soy Valentina, de Mendoza. Empecé con los tránsitos y terminé en el herbario. Me gusta que acá nadie corre.'),
  ('de500000-0000-4000-8000-000000000014', null, 'alumna@demo.humano', null, 1,
   'Hola, soy Camila. Llegué por la carta natal y ya voy por mi tercer curso. Me alegra encontrar un espacio donde se pregunta sin apuro.')
) as v(id, slug, email, teacher_name, days, body)
left join public.courses c on c.slug = v.slug
left join auth.users u on u.email = v.email
left join public.profiles t on t.full_name = v.teacher_name and t.role = 'teacher'
on conflict (id) do nothing;

-- ---------------------------------------------------------------- invitacion docente pendiente
insert into public.teacher_invitations (email, token_hash, invited_by, expires_at)
values ('mariana.celeste@demo.humano',
        encode(sha256('demo-humano-invitacion-mariana'::bytea), 'hex'),
        'de000000-0000-4000-8000-000000000002', now() + interval '6 days')
on conflict do nothing;

-- ---------------------------------------------------------------- diario
insert into public.diario_posts (id, teacher_id, slug, title, excerpt, body, status, published_at)
select v.id::uuid, t.id, v.slug, v.title, v.excerpt, v.body, v.status,
       case when v.status = 'published' then v.published_at::timestamptz end
from (values
  ('de600000-0000-4000-8000-000000000001', 'Sol Mayor', 'arcano-xiii-sin-miedo',
   'Cómo leer el Arcano XIII sin miedo',
   'La carta sin nombre es una de las más temidas del mazo. Casi nunca anuncia lo que creemos: habla de lo que ya terminó.',
   $b$Cuando alguien da vuelta el Arcano XIII, la mesa suele quedar en silencio. Es la carta que el imaginario popular decidió asociar con lo peor, y sin embargo en el tarot de Marsella ni siquiera lleva nombre. Un esqueleto con una guadaña siega el suelo, y entre las cabezas y las manos que brotan de la tierra hay coronas. Eso es lo primero que conviene mirar: lo que cae no cae solo, y lo que está por debajo sigue creciendo.

En veinte años de consulta no recuerdo una sola vez en que esta carta anunciara una muerte literal. Lo que dice, casi siempre, es que algo ya terminó y que todavía no lo hemos aceptado. El Arcano XIII no provoca el final: lo reconoce. Por eso la persona que lo recibe suele sentir alivio cuando se lo leemos con claridad, aunque llegara con miedo.

Para leerlo sin dramatismo propongo tres preguntas, siempre en este orden.

La primera: qué ciclo está cerrado aunque nadie lo haya dicho en voz alta. Puede ser un trabajo que se sostiene por inercia, una amistad que se volvió costumbre, una versión de nosotros mismos que ya no entra en la ropa. La carta no pide que lo cortemos con violencia, pide que dejemos de fingir que sigue vivo.

La segunda: qué cosa necesita espacio para crecer. La guadaña despeja. En la imagen, el terreno limpio es también terreno fértil. Si una lectura solo se queda en lo que se pierde, queda a medias; la otra mitad es lo que ahora puede ocupar ese lugar.

La tercera: qué acompaña a la carta en la tirada. El Arcano XIII casi nunca habla solo. Junto a la Estrella suele ser duelo con esperanza, junto a la Torre habla de un derrumbe que ya empezó, junto al Sol indica un cierre luminoso, de esos que uno agradece años después. Leerlo aislado es leerlo mal.

Hay un error frecuente en quienes empiezan: suavizar la carta por temor a asustar al consultante. Decir "es una transformación" y cambiar de tema no ayuda a nadie. Es mejor nombrar el final con respeto y quedarse sentado al lado de la otra persona mientras lo procesa. La palabra "transformación" es válida, pero solo cuando se acompaña de algo concreto: qué se transforma, en qué y a qué costo.

También hay un error contrario, el de la lectora que se encariña con el dramatismo. La carta nos da una imagen potente y es tentador subrayarla. Mi consejo es leerla con el mismo tono con el que leemos el Cuatro de Copas o el Siete de Bastos: con atención, sin teatro.

Un ejercicio simple para esta semana: tomá solo el Arcano XIII del mazo y ponelo frente a vos durante diez minutos. No busques su significado. Describí lo que ves, en voz alta o por escrito: los colores, la posición de las figuras, lo que está arriba y lo que está abajo. Al terminar, preguntate qué parte de tu vida se parece a esa escena. Casi siempre aparece algo concreto, y casi nunca es una muerte.

La carta sin nombre es una de las más honestas del mazo. No promete ni amenaza, simplemente ordena. Quien aprende a leerla bien pierde el miedo a todas las demás.$b$,
   'published', '2026-10-22 09:00:00-03'),

  ('de600000-0000-4000-8000-000000000002', 'Aurora Violeta', 'hierbas-para-el-otono',
   'Cinco hierbas para acompañar el otoño',
   'Cuando baja la temperatura el cuerpo pide otro ritmo. Cinco plantas simples, fáciles de conseguir, para atravesar la estación con calma.',
   $b$El otoño llega con un pedido claro: bajar el ritmo. Las hojas caen, la luz se acorta y el cuerpo nos lo hace saber con más sueño, más apetito de cosas tibias y una piel que empieza a resecarse. Las plantas que mejor acompañan esta estación no son las más exóticas sino las que tenemos cerca. Les comparto cinco que uso todos los años, con la forma más sencilla de prepararlas.

La primera es el tomillo. Pequeño, aromático, resistente al frío. En infusión ayuda cuando aparece la primera tos de la temporada y tiene un perfume que invita a quedarse un rato más en la cocina. Una cucharadita de hojas secas por taza, cubierta mientras reposa para que no se escape el aroma. Cinco minutos alcanzan.

La segunda es la manzanilla, la planta más subestimada que conozco. Calma el estómago, afloja la tensión del final del día y se lleva bien con casi todo. Prefiero la flor entera a la que viene en saquito, porque conserva los aceites. Una infusión larga antes de dormir, de diez minutos, es un pequeño ritual que recomiendo sin dudar.

La tercera es el jengibre. Técnicamente no es una hierba sino una raíz, pero en otoño se vuelve indispensable. Rallado fresco en agua caliente, con una rodaja de limón y un poco de miel, es el primer auxilio para el cuerpo que se enfría. Conviene no abusar si hay acidez; la cantidad justa es la que se siente tibia, no picante.

La cuarta es la caléndula. Aquí cambio de registro: no la tomo, la uso en la piel. Las flores maceradas en aceite de oliva durante cuatro semanas dan un ungüento sencillo que protege las manos resecas por el viento y el agua fría. Es una de las primeras cosas que enseño en el herbario y la que más agradecen mis alumnas.

La quinta es el romero. Estimula, despeja, y en la cocina acompaña las comidas más contundentes de la estación. Un ramito en el horno con papas y cebollas lo dice todo. También lo uso en vapor, en un bol de agua caliente, cuando hay congestión.

Algunas consideraciones antes de empezar. Primero, cosechar con respeto: elegir plantas sanas, lejos de caminos, y no llevarse nunca más de un tercio de lo que hay. Segundo, secar a la sombra y con buen aire, nunca al sol directo, que se lleva buena parte de lo que buscamos. Tercero, rotular todo con el nombre y la fecha; a los dos meses uno cree que se acuerda y no se acuerda.

Y una cuarta, la más importante: las plantas acompañan, no reemplazan. Si hay una afección persistente, una medicación en curso, un embarazo o un niño pequeño, la consulta con un profesional de la salud va primero. Trabajar con hierbas no es oponerse a la medicina, es complementar con lo cotidiano.

Si querés ir más allá, en Herbario lunar trabajamos el calendario de cosecha del hemisferio sur, con las fechas pensadas para nuestras estaciones y no para las del norte. Pero para empezar alcanza con una olla, una taza y la costumbre de detenerse. El otoño, bien mirado, es la estación que nos enseña a cuidar lo que ya tenemos.$b$,
   'published', '2026-10-18 10:30:00-03'),

  ('de600000-0000-4000-8000-000000000003', 'Sol Mayor', 'que-es-una-tirada-de-tres-cartas',
   'Qué es una tirada de tres cartas',
   'La tirada más simple del tarot es también la más reveladora. Cómo hacerla, cómo leerla y por qué conviene empezar por ahí.',
   $b$Si hubiera que elegir una sola tirada para aprender tarot, elegiría la de tres cartas. Es breve, es honesta y obliga a lo más difícil del oficio: interpretar sin esconderse detrás de la cantidad. Con tres cartas no hay manera de disimular. Lo que se ve, se ve.

La estructura es sencilla. Se baraja pensando en una pregunta, se cortan tres cartas y se colocan de izquierda a derecha. Lo que cada posición significa depende de la pregunta que se haya hecho, y ahí aparece el primer gran aprendizaje: no hay una única tirada de tres cartas, hay muchas.

La versión clásica es pasado, presente y futuro. Sirve, pero la uso poco, porque tiende a encerrar a la persona en un guion. Prefiero tres formas alternativas.

La primera: situación, obstáculo y consejo. Es la que recomiendo a quien consulta por una decisión concreta. La primera carta describe dónde estamos parados, la segunda nombra lo que se interpone y la tercera propone un modo de actuar.

La segunda: presente, lo oculto y el consejo. Es la que trabajamos en el curso de Tarot iniciático. La carta del medio es la más interesante porque pregunta por aquello que todavía no se quiere mirar. Casi nunca es cómoda, y está bien que no lo sea.

La tercera: yo, el otro y el vínculo. Se usa para relaciones de cualquier tipo, no solo de pareja. Muestra qué aporta cada parte y cuál es la dinámica que se forma entre ambas.

Para leerla bien conviene seguir un orden. Primero mirar las tres cartas juntas, antes de interpretar ninguna. ¿Hay predominio de un palo? ¿Hay arcanos mayores o solo menores? ¿Hay cartas que se miran entre sí o que se dan la espalda? Esa primera impresión global vale más que cualquier libro.

Después, leer cada carta en su posición, con una frase corta. No más. Es una buena disciplina: si no puedo decir lo esencial de una carta en una oración, todavía no la entendí.

Por último, volver a leer las tres como una historia. Esta es la parte que más cuesta y la que más enseña. Se trata de armar un pequeño relato donde cada carta sea consecuencia de la anterior. Si el relato no cierra, probablemente alguna carta esté mal leída.

Hay tres errores comunes. El primero es hacer la pregunta demasiado cerrada, de sí o no. La tirada de tres cartas responde mejor a preguntas abiertas como "qué necesito ver de esto" o "cómo puedo atravesar esta etapa". El segundo es repetir la tirada hasta que sale algo agradable: lo que salió la primera vez es lo que hay que leer. El tercero es convertir la lectura en sentencia. Las cartas muestran una dirección, no un destino.

Un consejo para quien empieza: llevar un cuaderno. Anotar la fecha, la pregunta, las tres cartas y la lectura en una sola frase. A las dos semanas conviene releer. Casi siempre uno descubre que entendió más de lo que creía y que ciertas cartas aparecen una y otra vez por una razón.

La tirada de tres cartas es humilde, pero no es menor. Es el lugar donde se aprende a mirar. Todo lo demás, la cruz celta, las tiradas anuales, las de relaciones, es una ampliación de esta mínima conversación entre quien pregunta y las imágenes.$b$,
   'published', '2026-10-12 11:00:00-03'),

  ('de600000-0000-4000-8000-000000000004', 'Luna Arce', 'retorno-de-saturno-sin-castigo',
   'El retorno de Saturno no es un castigo',
   'Hacia los veintinueve años Saturno vuelve al lugar donde estaba al nacer. Lo que suele contarse sobre ese momento es menos justo que lo que realmente ocurre.',
   $b$Entre los 28 y los 30 años, casi todas las personas atraviesan algo que la astrología llama retorno de Saturno. El planeta, que tarda unos veintinueve años y medio en dar una vuelta completa al Zodíaco, regresa al signo y al grado donde estaba cuando nacimos. Mucha gente llega a este momento con un temor heredado: se dice que es una época de pérdidas, de crisis, de ajustes de cuentas. Después de catorce años mirando cartas, puedo decir que esa fama es injusta con el planeta.

Saturno no castiga. Saturno pregunta. Es el planeta de los límites, de la estructura, del tiempo. Cuando vuelve a su lugar natal, nos hace una pregunta simple y exigente: qué de lo que construiste hasta ahora es realmente tuyo y qué fue heredado, imitado o aceptado por comodidad.

Lo que sigue suele ser incómodo, pero rara vez arbitrario. Quien tiene un trabajo que no eligió empieza a sentir que le queda chico. Quien sostuvo una relación por costumbre empieza a ver sus grietas. Quien postergó una vocación siente que ya no puede seguir postergándola. Nada de eso lo causa el planeta; el planeta marca el momento en que ya no se puede mirar para otro lado.

Para leer un retorno hay que mirar tres cosas en la carta natal.

La primera es la casa donde está Saturno. Ese es el territorio de la prueba. Si Saturno está en la casa seis, la pregunta tendrá que ver con el trabajo cotidiano y la salud; si está en la siete, con los vínculos; si está en la diez, con la vocación y el lugar en el mundo.

La segunda es el signo y los aspectos que recibe. Un Saturno en Cáncer no se vive igual que uno en Capricornio. Los aspectos con la Luna o con Venus suman una capa emocional; los que recibe de Marte hablan de impaciencia contra la espera.

La tercera es la etapa del tránsito. El retorno no es un día, es un proceso de dos o tres años que suele tener tres tiempos: la primera pasada, que presenta el tema; la retrogradación, que lo hace revisar; y la pasada final, que lo asienta. Quien llega a la tercera con trabajo hecho suele sentir que se le acomodó la vida.

Hay una pregunta que se repite en consulta: ¿cómo se atraviesa? No hay receta, pero sí algunas actitudes que ayudan. Hacer una lista honesta de lo que se sostiene por convicción y de lo que se sostiene por miedo. Elegir una sola cosa por vez para cambiar. Pedir ayuda sin vergüenza. Y, sobre todo, no apurarse: Saturno premia la constancia, no la urgencia.

También conviene desconfiar de las lecturas que prometen resultados rápidos. No se trata de pasar el retorno como quien pasa un examen, sino de aprovecharlo como quien recibe un mapa. El planeta no nos pide que cambiemos todo: nos pide que dejemos de sostener lo que no nos pertenece.

En el curso de Tránsitos y retornos dedicamos un módulo completo a este momento, con ejercicios para trabajar la carta propia. Pero incluso sin curso, hay algo que se puede hacer hoy. Tomar la carta natal, buscar a Saturno y preguntarse con honestidad qué mensaje trae su casa. Esa pregunta, sin resolverla del todo, es un buen comienzo.$b$,
   'published', '2026-10-05 08:45:00-03'),

  ('de600000-0000-4000-8000-000000000005', 'Aurora Violeta', 'lo-que-el-reiki-no-promete',
   'Lo que el reiki no promete',
   'Antes de empezar una práctica conviene saber qué se puede esperar de ella. Una mirada sobria sobre el reiki y su lugar en el cuidado cotidiano.',
   $b$Cada tanto alguien llega al curso de Reiki con una expectativa enorme: que la práctica le cure una dolencia, que le cambie la vida en una semana, que le revele un don. Mi primera tarea es bajar esa expectativa con cariño. No porque el reiki valga poco, sino porque vale por otras razones de las que se suelen prometer.

El reiki es una práctica de origen japonés, desarrollada a comienzos del siglo veinte, que se basa en la imposición de manos y en la atención sostenida. Quien lo aplica coloca las palmas sobre el cuerpo propio o ajeno, o a pocos centímetros de él, y se mantiene presente durante unos minutos en cada posición. Eso es todo. El resto lo ponen la calma, el silencio y el tiempo que se le dedica.

Hay cosas que el reiki no promete. No reemplaza un diagnóstico ni un tratamiento médico. No cura enfermedades. No predice el futuro. No exige creer en nada para funcionar, ni funciona mejor si se cree más. Cualquier persona que afirme lo contrario te está vendiendo algo que la práctica no ofrece.

Entonces, ¿para qué sirve? En mi experiencia, y en la de las personas que acompaño, el reiki ofrece tres cosas.

La primera es una pausa. En un día lleno de pantallas y obligaciones, dedicar diez minutos a apoyar las manos sobre el cuerpo y respirar es un acto casi revolucionario. Mucha de la sensación de bienestar que se reporta viene de ahí, y no hay nada de malo en reconocerlo.

La segunda es una forma de atención. Quien practica reiki durante meses empieza a notar el propio cuerpo con más finura: dónde hay tensión, dónde hay calor, dónde la respiración se corta. Esa información es valiosa en sí misma, más allá de cómo se la interprete.

La tercera es un hábito amable. La mayoría de las prácticas de cuidado personal fallan porque son exigentes. El reiki es lo contrario: suave, repetible, sin necesidad de equipamiento. Es más fácil sostener un hábito pequeño que uno heroico.

En el nivel I trabajamos justamente eso: la autoaplicación, las posiciones básicas, la ética de la práctica y un poco de historia. No se enseña a "canalizar energías" ni a hacer promesas. Se enseña a sentarse, a respirar, a apoyar las manos con atención y a no esperar nada especial a cambio.

Una nota sobre la ética, que me parece lo más importante. Quien aplica reiki a otra persona tiene que pedir permiso, respetar el ritmo de quien recibe y no hacer diagnósticos. Si alguien llega con un dolor, la primera respuesta es sugerir que consulte a un profesional de la salud. El reiki puede acompañar, no resolver.

Lo que sí puedo decir, después de tantos años, es que quienes lo sostienen suelen contar algo parecido: no que su vida cambió, sino que cambió su manera de habitarla. Con un poco más de calma, un poco más de atención. No es poco.

Si tenés curiosidad, te invito a probar este ejercicio. Sentada, con los ojos cerrados, apoyá una mano en el pecho y la otra en el abdomen. Respirá lento durante cinco minutos sin buscar nada. Al terminar, notá cómo estás. Esa es, en esencia, toda la práctica.$b$,
   'published', '2026-09-28 17:00:00-03'),

  ('de600000-0000-4000-8000-000000000006', 'Luna Arce', 'casas-vacias-en-la-carta',
   'Casas vacías: qué decir cuando no hay planetas',
   'Una casa sin planetas no es una casa sin historia. Notas para leer lo que no se ve a simple vista.',
   $b$Borrador: una casa sin planetas no es una casa sin contenido. Para leerla hay que mirar al regente de la casa, el signo en la cúspide y los aspectos que recibe. Pendiente de completar con ejemplos y de revisar la parte sobre las casas angulares.$b$,
   'draft', null)
) as v(id, teacher_name, slug, title, excerpt, body, status, published_at)
join public.profiles t on t.full_name = v.teacher_name and t.role = 'teacher'
on conflict (slug) do update set
  title = excluded.title, excerpt = excluded.excerpt, body = excluded.body;

commit;
