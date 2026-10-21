-- T-031 · Anuncios de la docente (SP-5).
--
-- QUIEN. Escribe y edita borradores solo la docente duena del curso. Publicar es del SERVIDOR
-- (R-4): `status` y `published_at` no tienen grant de cliente; el Server Action verifica la
-- titularidad con la sesion y escribe con service_role, como `PublishCourseControl`. Leen: la
-- duena todo lo de su curso, el admin los publicados (para moderar), la inscripta activa los
-- publicados y vigentes. Nunca `anon`. Retiran (soft delete) la duena y el admin, firmado y con
-- motivo (ADR-012).
--
-- DOS CLASES DE TRIGGER, POR ADR-011.
--   · `course_announcements_freeze_published`: INVARIANTE, sin bypass. Lo publicado ya salio por
--     mail: titulo, cuerpo, estado y fecha no cambian desde NINGUN lado, service_role incluido.
--     Y un retirado no se publica.
--   · `course_announcements_guard`: PERMISOS, con bypass de service_role. Quien edita y quien
--     retira.
--   Orden alfabetico de los BEFORE: freeze < guard < locator < set_updated_at < sync_published_at.
--   `sync_published_at` (0005) corre ultimo y deriva `published_at` del `status` que ya paso.
--
-- TRIO RELAJADO (leccion de 0017, mismo criterio que T-030): `deleted_by` es `on delete set null`;
-- con el CHECK estricto de 0014 la baja de una moderadora quedaria bloqueada. La firma la exige el
-- guard al retirar.

create table public.course_announcements (
  id             uuid        primary key default gen_random_uuid(),
  course_id      uuid        not null references public.courses (id) on delete cascade,
  author_id      uuid        not null references public.profiles (id) on delete cascade,
  title          text        not null,
  body           text        not null,
  status         text        not null default 'draft',
  published_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,
  deleted_by     uuid        references public.profiles (id) on delete set null,
  deleted_reason text,
  constraint course_announcements_status_check check (status in ('draft', 'published')),
  constraint course_announcements_published_at_matches_status
    check ((status = 'published') = (published_at is not null)),
  constraint course_announcements_title_length check (char_length(btrim(title)) between 3 and 200),
  constraint course_announcements_body_not_blank check (length(btrim(body)) > 0),
  constraint course_announcements_body_max_length check (char_length(body) <= 6000),
  constraint course_announcements_deleted_reason_length
    check (deleted_reason is null or char_length(btrim(deleted_reason)) between 1 and 500),
  constraint course_announcements_deleted_consistency check (
    (deleted_at is null) = (deleted_reason is null)
    and (deleted_by is null or deleted_at is not null)
  ),
  constraint course_announcements_title_no_locator check (not public.text_has_locator(title)),
  constraint course_announcements_body_no_locator check (not public.text_has_locator(body)),
  constraint course_announcements_deleted_reason_no_locator
    check (not public.text_has_locator(deleted_reason))
);

-- Lo que leen la ficha y /panel: los publicados vigentes de un curso, del mas nuevo al mas viejo.
create index course_announcements_published_idx
  on public.course_announcements (course_id, published_at desc)
  where status = 'published' and deleted_at is null;
-- Lo que lee el panel docente: todo lo de un curso por fecha de creacion.
create index course_announcements_course_idx on public.course_announcements (course_id, created_at desc);

-- `updated_at` se mueve solo cuando se mueve el texto (leccion de 0014).
create trigger course_announcements_set_updated_at
  before update of title, body on public.course_announcements
  for each row when (new.title is distinct from old.title or new.body is distinct from old.body)
  execute function public.set_updated_at();

-- La misma funcion generica que `courses` y `diario_posts` (0005, 0018).
create trigger course_announcements_sync_published_at
  before insert or update on public.course_announcements
  for each row execute function public.sync_published_at();

-- ================================================================ invariante (sin bypass)

create or replace function public.course_announcements_freeze_published()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.deleted_at is not null
     and (new.status is distinct from old.status or new.published_at is distinct from old.published_at) then
    raise exception 'course_announcements: un anuncio retirado no se publica' using errcode = '42501';
  end if;
  if old.status = 'published' and (
       new.title is distinct from old.title
       or new.body is distinct from old.body
       or new.status is distinct from old.status
       or new.published_at is distinct from old.published_at) then
    raise exception 'course_announcements: lo publicado ya salio por mail y no se reescribe' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger course_announcements_freeze_published
  before update on public.course_announcements
  for each row execute function public.course_announcements_freeze_published();

-- R-3 mitad exacta: el generico de 0025, sin bypass.
create trigger course_announcements_locator_guard
  before insert or update on public.course_announcements
  for each row execute function public.guard_locator_exacto('title', 'body', 'deleted_reason');

-- ================================================================ permisos (con bypass)

create or replace function public.guard_course_announcements()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if public.is_service_context() then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    raise exception 'course_announcements: retirar es soft delete, nunca DELETE' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    if new.author_id is distinct from v_uid then
      raise exception 'course_announcements: author_id tiene que ser quien escribe' using errcode = '42501';
    end if;
    if not public.owns_course(new.course_id) then
      raise exception 'course_announcements: solo la docente del curso anuncia' using errcode = '42501';
    end if;
    if new.status is distinct from 'draft' or new.published_at is not null then
      raise exception 'course_announcements: todo anuncio nace borrador' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.id is distinct from old.id
     or new.course_id is distinct from old.course_id
     or new.author_id is distinct from old.author_id
     or new.created_at is distinct from old.created_at then
    raise exception 'course_announcements: la identidad del anuncio no se reescribe' using errcode = '42501';
  end if;
  -- Defensa en profundidad: ya no hay grant, pero un grant mal agregado no tiene que alcanzar.
  if new.status is distinct from old.status or new.published_at is distinct from old.published_at then
    raise exception 'course_announcements: publicar es del servidor' using errcode = '42501';
  end if;

  if old.deleted_at is not null then
    if row(new.title, new.body, new.deleted_at, new.deleted_by, new.deleted_reason)
       is distinct from
       row(old.title, old.body, old.deleted_at, old.deleted_by, old.deleted_reason) then
      raise exception 'course_announcements: un anuncio retirado no se vuelve a tocar' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.deleted_at is distinct from old.deleted_at then
    if new.title is distinct from old.title or new.body is distinct from old.body then
      raise exception 'course_announcements: retirar no es editar' using errcode = '42501';
    end if;
    if not (public.owns_course(old.course_id) or public.is_admin()) then
      raise exception 'course_announcements: retirar es de la docente del curso o del admin' using errcode = '42501';
    end if;
    if new.deleted_by is distinct from v_uid then
      raise exception 'course_announcements: el retiro queda firmado por quien lo hizo' using errcode = '42501';
    end if;
    if new.deleted_reason is null or length(btrim(new.deleted_reason)) = 0 then
      raise exception 'course_announcements: retirar exige un motivo' using errcode = '42501';
    end if;
    return new;
  end if;

  -- Lo que no es retirar es editar: de la autora y mientras siga siendo la duena. Un no-op ajeno
  -- tambien se rechaza (leccion de 0014).
  if old.author_id is distinct from v_uid or not public.owns_course(old.course_id) then
    raise exception 'course_announcements: solo la docente que lo escribio lo edita' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger course_announcements_guard
  before insert or update or delete on public.course_announcements
  for each row execute function public.guard_course_announcements();

-- ================================================================ RLS

alter table public.course_announcements enable row level security;

-- La inscripta no ve borradores ni retirados: el retiro desaparece de ficha y panel aca, no en
-- un filtro de la consulta que alguien se puede olvidar.
create policy course_announcements_read on public.course_announcements
  for select to authenticated
  using (
    public.owns_course(course_id)
    or (status = 'published' and public.is_admin())
    or (status = 'published' and deleted_at is null and public.has_course_access(course_id))
  );

create policy course_announcements_insert on public.course_announcements
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and public.owns_course(course_id)
    and deleted_at is null and deleted_by is null and deleted_reason is null
  );

-- USING ancho (el de lectura): la inscripta que ve la fila llega al guard y recibe un 42501
-- explicito, no "0 filas, 200 OK".
create policy course_announcements_update on public.course_announcements
  for update to authenticated
  using (
    public.owns_course(course_id)
    or (status = 'published' and public.is_admin())
    or (status = 'published' and deleted_at is null and public.has_course_access(course_id))
  )
  with check (public.owns_course(course_id) or (status = 'published' and public.is_admin()));

-- Sin policy de DELETE: capa 2 de 3 contra el borrado fisico.

-- ================================================================ privilegios (R-1, whitelist)

revoke all on public.course_announcements from anon, authenticated;

grant select (id, course_id, author_id, title, body, status, published_at, created_at, updated_at,
              deleted_at, deleted_by, deleted_reason)
  on public.course_announcements to authenticated;
-- Sin status ni published_at (R-4) y sin deleted_* (nada nace retirado).
grant insert (course_id, author_id, title, body) on public.course_announcements to authenticated;
-- Sin status ni published_at: publicar es un Server Action con service_role.
grant update (title, body, deleted_at, deleted_by, deleted_reason) on public.course_announcements to authenticated;
-- Sin GRANT DELETE: capa 1 de 3.

grant all on public.course_announcements to service_role;

-- ================================================================ mail_log (0019:93)

-- El CHECK es cerrado: sin `course_announcement` el reclamo del turno falla con 23514 y ningun
-- mail sale. La lista es la MEDIDA en la base al arrancar el ticket (la de 0029, con
-- `enrollment_rejected`) mas el tipo nuevo. Sin `if exists`: si el nombre cambio, que falle.
alter table public.mail_log drop constraint mail_log_mail_type_check;
alter table public.mail_log add constraint mail_log_mail_type_check check (
  mail_type in ('welcome', 'enrollment_granted', 'course_completed', 'teacher_new_student',
                'enrollment_rejected', 'course_announcement')
);

-- Regla de 0005:153: toda migracion que crea funciones termina con este revoke.
revoke execute on all functions in schema public from public;
