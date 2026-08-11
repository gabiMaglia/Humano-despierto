-- T-021 · Campus — un hilo por curso + un hilo general (ADR-009)
--
-- POR QUE ESTE ARCHIVO EXISTE.
-- `/circulo` era un mock (`src/lib/mocks/community.ts`, declarado fuera de alcance de T-017
-- porque no habia tabla). El PO pidio la version minima honesta: un hilo por curso mas un hilo
-- general, "Campus". No hay canales, no hay foro con jerarquia — cada curso tiene EXACTAMENTE un
-- hilo, y hay UN hilo general. Modelar eso como una tabla `threads` + una tabla `messages` es una
-- indireccion sin uso: el hilo NO es una entidad con estado propio, es simplemente "los mensajes
-- de este curso" o "los mensajes sin curso". Por eso una sola tabla, con `course_id` NULLABLE
-- como clave del hilo: NULL = hilo general, no NULL = hilo de ese curso. Mismo principio que
-- `course_id` denormalizado en el resto del esquema (ADR-005): es la clave de acceso de RLS.
--
-- PERMISOS, decididos por el PO (no la UI, RLS — criterio 1):
--   · hilo de curso: escriben SOLO quienes tienen inscripcion ACTIVA. Se agrega que la docente
--     dueña TAMBIEN puede escribir en el hilo de su propio curso (no solo moderarlo) — el PO
--     pidio que modere, y moderar-pero-nunca-poder-responder-una-pregunta es un forro raro que
--     nadie pidio; es la lectura minima razonable de "la docente dueña modera ese hilo".
--   · hilo general: escribe cualquiera con sesion.
--   · moderacion: la docente dueña en el hilo de su curso, el admin en el general. `is_admin()`
--     se agrega TAMBIEN como moderador del hilo de curso (no solo del general): es el mismo
--     patron de superusuario que ya tiene el resto del esquema (`can_read_course`,
--     `enrollments_read`, `lesson_chapters_read_access` incluyen `is_admin()` sin que el ticket
--     que los creo lo pidiera explicitamente) — sin esto, un curso sin docente disponible no
--     tiene ninguna moderacion posible, y esa asimetria es peor que la superficie que agrega.
--
-- CRITERIO 2 · SOFT DELETE. Borrar es UPDATE de tres columnas (`deleted_at`, `deleted_by`,
-- `deleted_reason`), nunca DELETE. Tres capas, mismo patron que `enrollments_guard` (0005):
--   1) sin GRANT DELETE para el cliente (ni tabla ni columna) — 42501 antes de tocar RLS;
--   2) sin policy de DELETE — RLS deniega por default aunque el grant existiera;
--   3) el guard trigger rechaza tg_op='DELETE' explicitamente, por si el dia de mañana alguien
--      agrega el grant "para destrabar algo" sin revisar las otras dos capas.
-- El mensaje borrado SIGUE siendo legible, con motivo y con quien lo borro. **Esto es un supuesto
-- declarado (P-3), no una instruccion del PO** — una version anterior de este comentario se lo
-- atribuia a el con una cita entre comillas que nunca dijo, y lo encontro el verificador ciego.
-- El criterio 2 del backlog pide "soft delete con autor y motivo: quien modero y por que", que
-- justifica REGISTRAR quien y por que, no PUBLICAR el cuerpo. Se implementa asi porque una
-- moderacion que no se puede auditar es indistinguible de una censura, pero es una decision de
-- producto abierta: si el PO prefiere que el cuerpo se oculte a todos menos a moderacion, el
-- cambio es de la capa de lectura, no del esquema. Ver Q-08.
--
-- CRITERIO 4 · EL CHECK ANTI-LOCALIZADOR (ADR-009) RIGE TODOS LOS MENSAJES, SIN EXCEPCION.
--
-- La primera version de este archivo eximia al hilo de curso, argumentando que era "el mismo
-- criterio que `lesson_notes.body`" — que el unico lector ya tiene el acceso que el CHECK
-- protegeria. **El precedente era real y estaba mal elegido, y lo encontro QA con una
-- reproduccion end-to-end.** En `lesson_notes` la RLS es `user_id = auth.uid()`: el unico lector
-- ES quien escribe, asi que republicarse un link a uno mismo no expone nada. En un hilo de curso
-- el lector no es singular — es TODA la cohorte inscripta a ESE curso — y el que escribe es
-- cualquiera de ella.
--
-- El agujero concreto: una alumna inscripta solo a Carta Natal pegaba en SU hilo el `video_id`
-- de una leccion de Reiki (curso que no pago, cuyas `lessons` le dan 42501), y el resto de la
-- cohorte de Carta Natal lo leia en texto plano. El CHECK preguntaba "¿hace falta inscripcion
-- para leer esto?" cuando la pregunta era "¿el localizador pertenece al curso de ESTE hilo?".
-- Eso es ADR-003 regla A violada por una via lateral.
--
-- Se cierra por el lado simple: `text_has_locator` sobre TODO `body`. Un id de Drive o de
-- YouTube nunca es contenido legitimo de un mensaje de foro, asi que no hay falso positivo que
-- justifique la excepcion — y como el CHECK es de INSERT, el mensaje nunca llega a existir. Eso
-- importa porque el criterio 2 exige que el cuerpo del mensaje moderado siga siendo legible: el
-- soft delete NO redacta, asi que moderar jamas hubiera contenido esta fuga.
--
-- Nota aparte: el barrido AUTOMATIZADO de `tests/locator-free-text.test.mjs` deriva su clase de
-- `has_column_privilege('anon', ...)`, y esta tabla no tiene NINGUN grant para `anon` (el Campus
-- entero exige sesion, ni siquiera el hilo general es publico) — por eso esta columna no aparece
-- en ese barrido aunque el CHECK exista igual. La condicion de ADR-009 es "sin inscripcion", no
-- "sin sesion": son cosas distintas, y el barrido automatico solo mide la segunda.

-- ================================================================ la tabla

create table public.campus_posts (
  id             uuid        primary key default gen_random_uuid(),
  course_id      uuid        references public.courses (id) on delete cascade,
  author_id      uuid        not null references public.profiles (id) on delete cascade,
  body           text        not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,
  deleted_by     uuid        references public.profiles (id) on delete set null,
  deleted_reason text,
  constraint campus_posts_body_not_blank check (length(btrim(body)) > 0),
  constraint campus_posts_body_max_length check (char_length(body) <= 4000),
  constraint campus_posts_deleted_reason_not_blank
    check (deleted_reason is null or length(btrim(deleted_reason)) > 0),
  -- Consistencia del trio: o los tres son NULL (mensaje vivo) o los tres estan completos
  -- (borrado con autor y motivo, criterio 2). Nunca un estado a medias.
  constraint campus_posts_deleted_consistency check (
    (deleted_at is null) = (deleted_by is null)
    and (deleted_at is null) = (deleted_reason is null)
  ),
  -- Criterio 4, ver la nota de cabecera: rige TODOS los mensajes. Condicionarlo por hilo dejaba
  -- filtrar el localizador de un curso ajeno dentro del hilo del curso propio.
  constraint campus_posts_body_no_locator
    check (not public.text_has_locator(body))
);

-- El feed pagina por curso/fecha; el hilo general se filtra aparte porque `course_id is null`
-- no usa un indice parcial comun con el resto salvo que se declare el suyo.
create index campus_posts_course_idx  on public.campus_posts (course_id, created_at);
create index campus_posts_general_idx on public.campus_posts (created_at) where course_id is null;
create index campus_posts_author_idx  on public.campus_posts (author_id);

-- `updated_at` se mueve UNICAMENTE cuando se mueve el cuerpo, y por eso el trigger lleva `when`.
-- Sin esa condicion cualquier UPDATE lo pisaba con `now()`, con dos consecuencias reales que
-- encontro el verificador ciego: (a) el seed dejaba de ser idempotente — su `on conflict do
-- update ... updated_at = excluded.updated_at` quedaba pisado y las 19 filas salian marcadas
-- "(editado)" en la segunda corrida; (b) un PATCH que no cambiaba nada marcaba como editado el
-- mensaje de otro. El badge de la UI dice "editaron este texto": que lo diga en serio.
create trigger campus_posts_set_updated_at
  before update of body on public.campus_posts
  for each row when (new.body is distinct from old.body)
  execute function public.set_updated_at();

-- ================================================================ helpers de policy
--
-- Un solo predicado de visibilidad, reusado en SELECT y en el USING/WITH CHECK de UPDATE — evita
-- que la regla de "quien puede ver este hilo" se escriba tres veces y se desincronice en una.

create or replace function public.can_read_campus_thread(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_course_id is null
      or public.has_course_access(p_course_id)
      or public.owns_course(p_course_id)
      or public.is_admin();
$$;

-- Quien puede ESCRIBIR un mensaje nuevo en el hilo (criterio 1). Hilo general: cualquier sesion
-- (la policy ya exige `to authenticated`, no hace falta repetirlo aca). Hilo de curso: inscripcion
-- activa, o la docente dueña respondiendo en su propio hilo (ver nota de cabecera).
create or replace function public.can_write_campus_post(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_course_id is null
      or public.has_course_access(p_course_id)
      or public.owns_course(p_course_id);
$$;

-- Quien puede MODERAR (soft delete) el hilo. General: admin. De curso: la docente dueña o admin.
create or replace function public.is_campus_moderator(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_course_id is null then public.is_admin()
    else public.owns_course(p_course_id) or public.is_admin()
  end;
$$;

-- Quien escribió cada mensaje del hilo, y SOLO eso — descubierto viendo el Campus renderizado
-- (no en el diseño de mesa): `profiles_read_public` (0004) expone `role in ('teacher','admin')`
-- o la fila propia — a propósito, "el padrón de alumnado no es dato público". Un hilo con
-- alumnas necesita mostrar QUIÉN escribió, y ese caso no lo contempló 0004 porque el Campus no
-- existía. Abrir una policy de tabla sobre `profiles` para "cualquiera que comparta un hilo
-- legible" filtraría TODA la fila (bio/headline/quote/formations/testimonials incluidos, porque
-- el GRANT de columna de 0003/0011 ya es amplio y una policy no puede angostarlo por columna) a
-- cualquiera que alguna vez comparta un hilo — más de lo que el Campus necesita. Esta función
-- devuelve nombre/glyph/rol nada más, y solo de quien escribió en un hilo que quien pregunta
-- puede leer — la superficie exacta que la UI consume (`author:profiles!...` no se usa para
-- resolver el autor; se resuelve por acá).
create or replace function public.campus_post_authors(p_ids uuid[])
returns table(id uuid, full_name text, glyph text, role text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.full_name, p.glyph, p.role
  from public.profiles p
  where p.id = any(p_ids)
    and exists (
      select 1 from public.campus_posts cp
      where cp.author_id = p.id and public.can_read_campus_thread(cp.course_id)
    );
$$;

-- ================================================================ RLS

alter table public.campus_posts enable row level security;

create policy campus_posts_read on public.campus_posts
  for select to authenticated
  using (public.can_read_campus_thread(course_id));

create policy campus_posts_insert on public.campus_posts
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and deleted_at is null and deleted_by is null and deleted_reason is null
    and public.can_write_campus_post(course_id)
  );

-- USING/WITH CHECK solo exigen "puede ver este hilo" (igual que SELECT): asi una fila alcanzable
-- SIEMPRE llega al guard trigger, que es quien de verdad decide que mutacion es legitima. Con un
-- USING mas angosto (p.ej. "es su propio mensaje"), un intento de moderar/editar ajeno filtraria
-- la fila en silencio (0 filas afectadas, 200 OK) en vez de devolver el 42501 explicito que pide
-- el criterio 1 — ver el meta-test `tests/campus-posts.test.mjs` y los ataques de
-- `harness/b1-postgrest-attacks.sh`.
create policy campus_posts_update on public.campus_posts
  for update to authenticated
  using (public.can_read_campus_thread(course_id))
  with check (public.can_read_campus_thread(course_id));

-- Sin policy de DELETE: capa 2 de 3 contra el hard delete (ver cabecera).

-- ================================================================ guard trigger
--
-- Arbitra un PERMISO (quien puede tocar que), no un invariante — mismo patron que `courses_guard`/
-- `guard_lessons` (0005/0006): SECURITY INVOKER (para que `is_service_context()` vea el
-- `current_user` real) y CON bypass de contexto de servicio.

create or replace function public.guard_campus_posts()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_service_context() then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    raise exception 'campus_posts: borrar es soft delete (UPDATE de deleted_at/deleted_by/deleted_reason), nunca DELETE'
      using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    if new.author_id is distinct from auth.uid() then
      raise exception 'campus_posts: author_id tiene que ser quien escribe' using errcode = '42501';
    end if;
    return new;
  end if;

  -- tg_op = 'UPDATE' de aca en mas.
  if new.id is distinct from old.id
     or new.course_id is distinct from old.course_id
     or new.author_id is distinct from old.author_id
     or new.created_at is distinct from old.created_at then
    raise exception 'campus_posts: la identidad del mensaje no se reescribe' using errcode = '42501';
  end if;

  if old.deleted_at is not null then
    -- Un mensaje borrado queda congelado: ni se re-edita el cuerpo ni se retoca el borrado.
    if new.body is distinct from old.body
       or new.deleted_at is distinct from old.deleted_at
       or new.deleted_by is distinct from old.deleted_by
       or new.deleted_reason is distinct from old.deleted_reason then
      raise exception 'campus_posts: un mensaje borrado no se vuelve a tocar' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.deleted_at is distinct from old.deleted_at then
    -- Se esta borrando en esta sentencia (de null a not null: nunca al reves, "old.deleted_at is
    -- not null" ya salio por la rama de arriba).
    if new.body is distinct from old.body then
      raise exception 'campus_posts: moderar no es editar el cuerpo del mensaje' using errcode = '42501';
    end if;
    if not public.is_campus_moderator(old.course_id) then
      raise exception 'campus_posts: borrar es privilegio de quien modera este hilo' using errcode = '42501';
    end if;
    if new.deleted_by is distinct from auth.uid() then
      raise exception 'campus_posts: el borrado queda firmado por quien lo hizo' using errcode = '42501';
    end if;
    if new.deleted_reason is null or length(btrim(new.deleted_reason)) = 0 then
      raise exception 'campus_posts: borrar exige un motivo' using errcode = '42501';
    end if;
    return new;
  end if;

  -- No es un borrado ni el retoque de uno: entonces es una edicion, y editar es del autor.
  --
  -- La condicion NO pregunta si el cuerpo cambio. Preguntarlo dejaba pasar el UPDATE que no
  -- cambia nada, y ese no es inofensivo: la policy de arriba deja alcanzar CUALQUIER fila
  -- legible, asi que un `PATCH {"deleted_reason":null}` sobre `course_id=is.null` llegaba hasta
  -- aca desde cualquier sesion, tocaba el hilo general entero y — via `set_updated_at` — dejaba
  -- los mensajes ajenos marcados "(editado)". Lo encontro el verificador ciego. La pregunta
  -- correcta es quien esta mutando la fila, no cuanto la muta.
  if old.author_id is distinct from auth.uid() then
    raise exception 'campus_posts: solo quien lo escribio edita su mensaje' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger campus_posts_guard
  before insert or update or delete on public.campus_posts
  for each row execute function public.guard_campus_posts();

-- ================================================================ privilegios (ADR-008: whitelist)
--
-- Sin `anon` en ningun grant: el Campus entero exige sesion (ver nota de cabecera, criterio 4).
-- `deleted_at/deleted_by/deleted_reason` FUERA del INSERT (nadie nace borrado) pero DENTRO del
-- UPDATE (es la via de moderacion) — mismo patron que `lesson_progress.completed*` al reves: alli
-- la columna estaba mal en el INSERT, aca directamente no esta.
grant select (id, course_id, author_id, body, created_at, updated_at,
              deleted_at, deleted_by, deleted_reason)
  on public.campus_posts to authenticated;
grant insert (course_id, author_id, body) on public.campus_posts to authenticated;
grant update (body, deleted_at, deleted_by, deleted_reason) on public.campus_posts to authenticated;
-- sin GRANT DELETE para ningun rol de cliente (capa 1 de 3, ver cabecera).

-- ================================================================ privilegios de ejecucion
--
-- Regla de 0005:153 — toda migracion que crea funciones termina con este revoke, porque Postgres
-- otorga EXECUTE a PUBLIC en toda funcion nueva por default del CORE.
revoke execute on all functions in schema public from public;

grant execute on function public.can_read_campus_thread(uuid)   to authenticated, service_role;
grant execute on function public.can_write_campus_post(uuid)    to authenticated, service_role;
grant execute on function public.is_campus_moderator(uuid)      to authenticated, service_role;
grant execute on function public.campus_post_authors(uuid[])    to authenticated, service_role;
