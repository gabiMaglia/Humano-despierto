-- T-011 · Guards de INSERT — cierre del patron "protegido en UPDATE, abierto en INSERT"
--
-- POR QUE ESTE ARCHIVO EXISTE.
-- 0005 dejo tres triggers `before update` y ningun `before insert`. Donde la unica barrera del
-- alta era el whitelist de columnas de 0003, el esquema quedaba con UNA capa: una lista que
-- alguien edita "para destrabar algo" y nadie lo nota. En `lesson_progress` el agujero no era
-- latente sino ABIERTO: `completed` y `completed_at` SI estaban en el grant de INSERT, de modo
-- que un alumno inscripto se auto-certificaba una leccion con
--     insert into lesson_progress (..., seconds_watched, completed, completed_at)
--     values (..., 1, true, now());
-- No es escalada de privilegio; es integridad de negocio. Con eso, el progreso deja de
-- significar nada y T-006/T-007 se construyen sobre un dato falsificable.
--
-- Convenciones heredadas de 0005 y sostenidas aca:
--   · SECURITY INVOKER en todo guard: dentro de un SECURITY DEFINER `current_user` pasa a ser el
--     owner y el guard se auto-eximiria siempre.
--   · `set search_path = ''` en toda funcion de `public`, y todo nombre calificado.
--   · el archivo termina con el revoke de EXECUTE a PUBLIC (regla declarada en 0005:153).

-- ================================================================ criterio 1 · lesson_progress
--
-- `completed`/`completed_at` pasan a ser columnas DERIVADAS: son funcion de
-- (`lesson_id`, `seconds_watched`), nunca de lo que declare el cliente. Dos capas:
--   1) 0003 ya no las incluye en el grant de INSERT ni de UPDATE (el cliente no puede nombrarlas);
--   2) estos triggers las recalculan en INSERT y en UPDATE.
--
-- El umbral se evalua contra `lessons.duration_seconds`, que desde T-012 el cliente NO escribe por
-- ninguna via: la duracion la resuelve el servidor contra la API de YouTube al cargar el video
-- (T-005). Mientras estuvo en el grant de UPDATE de la docente dueña, bajarla a 5 s certificaba
-- retroactivamente a toda su cohorte: la vara de la certificacion la editaba la parte interesada.

-- Umbral unico, en un solo lugar. Aritmetica entera a proposito (regla de la casa: nunca float):
-- `s*100 >= d*90` es exactamente `s >= 0.9*d` sin redondeo.
-- `duration_seconds > 0` NO es una guarda decorativa: la columna nace en 0 (0001:99), y sin ella
-- toda leccion sin duracion cargada seria completable con 0 segundos vistos.
create or replace function public.lesson_progress_completes(
  p_lesson_id       uuid,
  p_seconds_watched integer
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.lessons l
    where l.id = p_lesson_id
      and l.duration_seconds > 0
      and p_seconds_watched::bigint * 100 >= l.duration_seconds::bigint * 90
  );
$$;

-- SECURITY DEFINER a proposito: necesita resolver la duracion sin la RLS de `lessons`, porque un
-- curso archivado o una leccion despublicada dejarian de resolverla y el alumno no podria completar
-- nada.
--
-- T-012 · H-1. La version de T-011 justificaba esto con "no es oraculo de nada: `duration_seconds`
-- ya se sirve a `anon`". ERA FALSO y el juez ciego lo demostro: el whitelist de SELECT solo entrega
-- la columna en las filas que `lessons_read` expone (`0004:71-73` exige `is_published or
-- owns_course`), y un borrador ajeno no cumple ninguna de las dos. Con EXECUTE para `authenticated`
-- y un `p_lesson_id` arbitrario, busqueda binaria sobre esta funcion devuelve el
-- `duration_seconds` exacto de contenido que la RLS oculta.
--
-- El cierre: la funcion NO se otorga a `authenticated` (ver el pie del archivo). La invocan solo los
-- dos guards de `lesson_progress`, que por eso pasan a ser SECURITY DEFINER.
-- Esto NO reintroduce la trampa que 0005 documenta —un guard DEFINER cuyo `is_service_context()`
-- se auto-eximiria siempre— porque estos dos guards no consultan `current_user` por ninguna via:
-- no tienen bypass de service_role, a proposito (mantienen un invariante, no arbitran un permiso).
-- Los guards que SI lo consultan (`guard_courses_insert`, `guard_lessons`) siguen siendo INVOKER.
--
-- Queda una via de consulta, y esa si esta compuertada: escribir `lesson_progress` y leer
-- `completed`. Exige acertar el par (lesson_id, course_id) de la FK compuesta y pasar el WITH CHECK
-- de `lesson_progress_insert_own` — `has_course_access(course_id) or lesson_is_preview(lesson_id)`.
-- Sobre un borrador ajeno no hay inscripcion ni preview: el INSERT se rechaza y no hay respuesta
-- que leer.

create or replace function public.guard_lesson_progress_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- La fila no nace completada por declaracion del cliente: nace con lo que diga el umbral.
  -- Sin bypass de service_role, a diferencia de los guards de privilegio de 0005: esto no
  -- arbitra un permiso, mantiene un INVARIANTE. Un invariante con puerta trasera no es un
  -- invariante. Para "marcar completada" desde un Server Action se escribe `seconds_watched`,
  -- que es el dato del que `completed` es funcion.
  new.completed    := public.lesson_progress_completes(new.lesson_id, new.seconds_watched);
  new.completed_at := case when new.completed then now() else null end;
  return new;
end;
$$;

create trigger lesson_progress_guard_insert
  before insert on public.lesson_progress
  for each row execute function public.guard_lesson_progress_insert();

-- Reemplaza la version de 0005 (que solo era monotona) conservando su trigger.
-- Lo agregado es el `elsif`: la certificacion la decide el umbral, tambien en UPDATE.
create or replace function public.guard_lesson_progress()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Race real: el player escribe con throttle desde N pestañas. Sin esto, la pestaña lenta
  -- pisa el avance de la rapida y la barra retrocede.
  new.seconds_watched := greatest(new.seconds_watched, old.seconds_watched);
  new.last_seen_at    := greatest(new.last_seen_at, old.last_seen_at);

  if old.completed then
    -- Completar es irreversible y el sello original no se reescribe.
    new.completed    := true;
    new.completed_at := old.completed_at;
  elsif public.lesson_progress_completes(new.lesson_id, new.seconds_watched) then
    new.completed    := true;
    new.completed_at := now();
  else
    new.completed    := false;
    new.completed_at := null;
  end if;

  return new;
end;
$$;

-- ================================================================ criterio 2 · courses
--
-- `courses_guard` (0005:73) es BEFORE UPDATE: en el alta la unica capa era el grant de 0003.
-- Este trigger es la segunda.
create or replace function public.guard_courses_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_service_context() then
    return new;
  end if;
  if new.status is distinct from 'draft' then
    raise exception 'un curso nace en draft: publicar es privilegio de service_role (T-008)'
      using errcode = '42501';
  end if;
  if new.featured then
    raise exception 'courses.featured es curaduria, no lo decide el docente'
      using errcode = '42501';
  end if;
  if new.published_at is not null then
    raise exception 'courses.published_at lo fija el servidor al publicar'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- El nombre importa: con igual timing, Postgres dispara los triggers por orden ALFABETICO.
-- `courses_guard_insert` < `courses_sync_published_at`, asi que el guard ve el NEW crudo.
-- Al reves, sync_published_at (0005:137) ya habria puesto `published_at := null` para un
-- status != 'published' y la tercera comprobacion no podria fallar nunca.
create trigger courses_guard_insert
  before insert on public.courses
  for each row execute function public.guard_courses_insert();

-- ================================================================ criterio 3 · lessons
--
-- `lessons` no tenia NINGUN guard: ni en INSERT ni en UPDATE. Sus dos columnas de servidor
-- (`is_published`, `video_id`) se sostenian solo en que no figuran en el grant de 0003.
--   · `is_published`: publicar una leccion es acto del servidor (T-005), no del cliente.
--   · `video_id`: primer miembro de la clase "localizador de contenido pago" (ADR-003). El
--     defecto 4 de la ronda 1 de T-001 probo que el revoke de columna era su UNICA barrera de
--     escritura, incluso para la docente dueña.
--   · `duration_seconds` (T-012 · decision del PO): es la VARA contra la que se certifica el
--     progreso (ADR-007). Mientras la escribio la docente dueña, bajarla a 5 s certificaba de una
--     sentencia a toda su cohorte — y el caso probable no era fraude sino una correccion de dato
--     que certifica retroactivamente sin que nadie lo note. La resuelve el servidor contra la API
--     de YouTube al pegar la URL del video (T-005); el docente no la ve ni la toca.
create or replace function public.guard_lessons()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_service_context() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.is_published then
      raise exception 'lessons.is_published lo fija el servidor al publicar la leccion (T-005)'
        using errcode = '42501';
    end if;
    if new.video_id is not null then
      raise exception 'lessons.video_id no se escribe desde el cliente (ADR-003)'
        using errcode = '42501';
    end if;
    -- La leccion nace sin duracion: la trae YouTube cuando el servidor resuelve el video.
    if new.duration_seconds is distinct from 0 then
      raise exception 'lessons.duration_seconds lo resuelve el servidor desde el video (T-005)'
        using errcode = '42501';
    end if;
  else
    if new.is_published is distinct from old.is_published then
      raise exception 'lessons.is_published lo fija el servidor al publicar la leccion (T-005)'
        using errcode = '42501';
    end if;
    if new.video_id is distinct from old.video_id then
      raise exception 'lessons.video_id no se escribe desde el cliente (ADR-003)'
        using errcode = '42501';
    end if;
    if new.duration_seconds is distinct from old.duration_seconds then
      raise exception 'lessons.duration_seconds lo resuelve el servidor desde el video (T-005)'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

create trigger lessons_guard
  before insert or update on public.lessons
  for each row execute function public.guard_lessons();

-- ================================================================ privilegios de ejecucion
--
-- REGLA de 0005:153 — toda migracion que crea funciones termina con este revoke. Postgres otorga
-- EXECUTE a PUBLIC en toda funcion nueva y es un default del CORE: ni el revoke en bloque de
-- 0002:158 (corre antes) ni `alter default privileges` (0003:18) lo sacan.
revoke execute on all functions in schema public from public;

-- T-012 · H-1: `lesson_progress_completes()` NO lleva grant para `authenticated`. La llaman los dos
-- guards de `lesson_progress`, que son SECURITY DEFINER y corren como owner: ahi el EXECUTE esta
-- cubierto por la propiedad de la funcion, no por un grant. Otorgarsela al cliente la convertia en
-- un oraculo de `duration_seconds` sobre lecciones que la RLS oculta (ver el bloque de arriba).
-- `service_role` conserva el EXECUTE que le deja el `alter default privileges` de Supabase —0003:18
-- solo lo revoca a `anon` y `authenticated`— y no se lo quita este archivo: para `service_role` no
-- es oraculo de nada, ya lee `lessons` entera sin pasar por RLS.
--
-- `is_service_context()` (0005:161) conserva su grant a `authenticated`: la llaman
-- `guard_courses_insert` y `guard_lessons`, que siguen siendo INVOKER.
