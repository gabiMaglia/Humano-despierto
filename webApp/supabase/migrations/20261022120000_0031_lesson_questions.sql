-- T-030 · Q&A por leccion (SP-5, ADR-012 para la moderacion).
--
-- POR QUE TABLAS NUEVAS Y NO `campus_posts`. Campus es por curso y no tiene ciclo de vida. Una
-- pregunta se resuelve, junta votos y tiene UNA respuesta destacada de la docente: meter eso en
-- `campus_posts` volvia fragil un CHECK que ya es delicado. Decision 3 del PO (2026-09-09).
--
-- QUIEN. Leen: inscripta activa, docente duena, admin, o cualquier sesion si la leccion es
-- `is_preview` (el mismo predicado que 0004 usa para `lesson_progress`). Escriben: lo mismo menos
-- el admin, que modera y no participa (criterio de 0014). Moderan (soft delete) la docente duena
-- y el admin. Nunca `anon`: ni un grant.
--
-- DOS CLASES DE TRIGGER, POR ADR-011.
--   · `*_derive_scope`: INVARIANTES, sin bypass. `course_id`/`lesson_id` salen de la leccion o de
--     la pregunta, nunca del cliente (denormalizar sin guard es como se filtra), e
--     `is_instructor_answer` sale de `courses.teacher_id = author_id`. SECURITY DEFINER para leer
--     `lessons` sin depender de la RLS de quien escribe: lo que devuelven es solo una clave, y
--     la RLS de esta tabla decide despues sobre la fila ya completa.
--   · `guard_*`: PERMISOS, con bypass de service_role. Quien edita que.
--   Los nombres importan: Postgres dispara los BEFORE en orden alfabetico, y `derive` (d) tiene
--   que correr antes que `guard` (g), que usa el `course_id` derivado.
--
-- TRIO RELAJADO. `deleted_by`/`resolved_by`/`featured_by` son `on delete set null`. Con el CHECK
-- estricto de 0014 la baja de una moderadora violaria el CHECK y quedaria bloqueada (el bug de
-- 0017). La firma la exige el guard en el momento de moderar; despues puede quedar en null.

-- ================================================================ tablas

create table public.lesson_questions (
  id             uuid        primary key default gen_random_uuid(),
  lesson_id      uuid        not null,
  course_id      uuid        not null references public.courses (id) on delete cascade,
  author_id      uuid        not null references public.profiles (id) on delete cascade,
  title          text        not null,
  body           text        not null,
  resolved_at    timestamptz,
  resolved_by    uuid        references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,
  deleted_by     uuid        references public.profiles (id) on delete set null,
  deleted_reason text,
  constraint lesson_questions_lesson_fk foreign key (lesson_id, course_id)
    references public.lessons (id, course_id) on delete cascade,
  -- Destino de la FK compuesta de `lesson_answers`.
  constraint lesson_questions_scope_key unique (id, lesson_id, course_id),
  constraint lesson_questions_title_length
    check (char_length(btrim(title)) between 3 and 200),
  constraint lesson_questions_body_not_blank check (length(btrim(body)) > 0),
  constraint lesson_questions_body_max_length check (char_length(body) <= 4000),
  constraint lesson_questions_deleted_reason_length
    check (deleted_reason is null or char_length(btrim(deleted_reason)) between 1 and 500),
  constraint lesson_questions_deleted_consistency check (
    (deleted_at is null) = (deleted_reason is null)
    and (deleted_by is null or deleted_at is not null)
  ),
  constraint lesson_questions_resolved_consistency
    check (resolved_by is null or resolved_at is not null),
  constraint lesson_questions_title_no_locator check (not public.text_has_locator(title)),
  constraint lesson_questions_body_no_locator check (not public.text_has_locator(body)),
  constraint lesson_questions_deleted_reason_no_locator
    check (not public.text_has_locator(deleted_reason))
);

create index lesson_questions_lesson_idx on public.lesson_questions (lesson_id, created_at);
create index lesson_questions_open_idx on public.lesson_questions (course_id)
  where deleted_at is null and resolved_at is null;
create index lesson_questions_author_idx on public.lesson_questions (author_id);

create table public.lesson_answers (
  id                   uuid        primary key default gen_random_uuid(),
  question_id          uuid        not null,
  lesson_id            uuid        not null,
  course_id            uuid        not null references public.courses (id) on delete cascade,
  author_id            uuid        not null references public.profiles (id) on delete cascade,
  body                 text        not null,
  is_instructor_answer boolean     not null default false,
  featured_at          timestamptz,
  featured_by          uuid        references public.profiles (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted_at           timestamptz,
  deleted_by           uuid        references public.profiles (id) on delete set null,
  deleted_reason       text,
  constraint lesson_answers_question_fk foreign key (question_id, lesson_id, course_id)
    references public.lesson_questions (id, lesson_id, course_id) on delete cascade,
  constraint lesson_answers_body_not_blank check (length(btrim(body)) > 0),
  constraint lesson_answers_body_max_length check (char_length(body) <= 4000),
  constraint lesson_answers_deleted_reason_length
    check (deleted_reason is null or char_length(btrim(deleted_reason)) between 1 and 500),
  constraint lesson_answers_deleted_consistency check (
    (deleted_at is null) = (deleted_reason is null)
    and (deleted_by is null or deleted_at is not null)
  ),
  constraint lesson_answers_featured_consistency
    check (featured_by is null or featured_at is not null),
  -- El guard ya devuelve 42501 antes; esto cubre a service_role, que no pasa por el guard.
  constraint lesson_answers_featured_only_instructor
    check (featured_at is null or is_instructor_answer),
  constraint lesson_answers_body_no_locator check (not public.text_has_locator(body)),
  constraint lesson_answers_deleted_reason_no_locator
    check (not public.text_has_locator(deleted_reason))
);

-- Una destacada por pregunta: la segunda es 23505 (criterio 5).
create unique index lesson_answers_one_featured_key on public.lesson_answers (question_id)
  where featured_at is not null;
create index lesson_answers_question_idx on public.lesson_answers (question_id, created_at);

create table public.lesson_question_votes (
  question_id uuid        not null references public.lesson_questions (id) on delete cascade,
  user_id     uuid        not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  -- Doble voto = 23505 por la PK (criterio 7), sin logica extra.
  primary key (question_id, user_id)
);

-- `updated_at` se mueve solo cuando se mueve el texto (leccion de 0014: un PATCH no-op marcaba
-- "(editado)" el mensaje ajeno).
create trigger lesson_questions_set_updated_at
  before update of title, body on public.lesson_questions
  for each row when (new.title is distinct from old.title or new.body is distinct from old.body)
  execute function public.set_updated_at();

create trigger lesson_answers_set_updated_at
  before update of body on public.lesson_answers
  for each row when (new.body is distinct from old.body)
  execute function public.set_updated_at();

-- ================================================================ predicados

create or replace function public.can_read_lesson_qa(p_course_id uuid, p_lesson_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_course_access(p_course_id)
      or public.owns_course(p_course_id)
      or public.is_admin()
      or public.lesson_is_preview(p_lesson_id);
$$;

create or replace function public.can_write_lesson_qa(p_course_id uuid, p_lesson_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_course_access(p_course_id)
      or public.owns_course(p_course_id)
      or public.lesson_is_preview(p_lesson_id);
$$;

create or replace function public.is_lesson_qa_moderator(p_course_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.owns_course(p_course_id) or public.is_admin();
$$;

create or replace function public.can_vote_lesson_question(p_question_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.lesson_questions q
    where q.id = p_question_id
      and q.deleted_at is null
      and public.can_write_lesson_qa(q.course_id, q.lesson_id)
  );
$$;

-- ================================================================ invariantes (sin bypass)

create or replace function public.lesson_questions_derive_scope()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_course uuid;
begin
  if tg_op = 'UPDATE' then
    if new.lesson_id is distinct from old.lesson_id or new.course_id is distinct from old.course_id then
      raise exception 'lesson_questions: una pregunta no cambia de leccion ni de curso' using errcode = '42501';
    end if;
    return new;
  end if;

  select l.course_id into v_course from public.lessons l where l.id = new.lesson_id;
  if v_course is null then
    raise exception 'lesson_questions: la leccion no existe' using errcode = '23503';
  end if;
  new.course_id := v_course;
  return new;
end;
$$;

create trigger lesson_questions_derive_scope
  before insert or update on public.lesson_questions
  for each row execute function public.lesson_questions_derive_scope();

create or replace function public.lesson_answers_derive_scope()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.question_id is distinct from old.question_id
       or new.lesson_id is distinct from old.lesson_id
       or new.course_id is distinct from old.course_id
       or new.is_instructor_answer is distinct from old.is_instructor_answer then
      raise exception 'lesson_answers: el alcance y la autoria docente no se reescriben' using errcode = '42501';
    end if;
    return new;
  end if;

  select q.lesson_id, q.course_id into new.lesson_id, new.course_id
    from public.lesson_questions q where q.id = new.question_id;
  if new.course_id is null then
    raise exception 'lesson_answers: la pregunta no existe' using errcode = '23503';
  end if;
  -- Desde `author_id` y no con owns_course(): con service_role `auth.uid()` es null y la
  -- respuesta de la docente sembrada por el servidor nacia "de alumna".
  -- E3 (R-2, D-16): ademas de `teacher_id`, el ROL de la columna. Una duena degradada sigue
  -- siendo `teacher_id` del curso y su respuesta no puede nacer de docente.
  new.is_instructor_answer := exists (
    select 1 from public.courses c
      join public.profiles p on p.id = c.teacher_id
     where c.id = new.course_id and c.teacher_id = new.author_id and p.role = 'teacher'
  );
  return new;
end;
$$;

create trigger lesson_answers_derive_scope
  before insert or update on public.lesson_answers
  for each row execute function public.lesson_answers_derive_scope();

-- R-3 mitad exacta: el generico de 0025, tambien sin bypass.
create trigger lesson_questions_locator_guard
  before insert or update on public.lesson_questions
  for each row execute function public.guard_locator_exacto('title', 'body', 'deleted_reason');

create trigger lesson_answers_locator_guard
  before insert or update on public.lesson_answers
  for each row execute function public.guard_locator_exacto('body', 'deleted_reason');

-- ================================================================ permisos (con bypass)

create or replace function public.guard_lesson_questions()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_uid       uuid := auth.uid();
  v_resolving boolean;
begin
  if public.is_service_context() then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    raise exception 'lesson_questions: borrar es soft delete, nunca DELETE' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    if new.author_id is distinct from v_uid then
      raise exception 'lesson_questions: author_id tiene que ser quien pregunta' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.id is distinct from old.id
     or new.author_id is distinct from old.author_id
     or new.created_at is distinct from old.created_at then
    raise exception 'lesson_questions: la identidad de la pregunta no se reescribe' using errcode = '42501';
  end if;

  if old.deleted_at is not null then
    if row(new.title, new.body, new.resolved_at, new.resolved_by, new.deleted_at, new.deleted_by, new.deleted_reason)
       is distinct from
       row(old.title, old.body, old.resolved_at, old.resolved_by, old.deleted_at, old.deleted_by, old.deleted_reason) then
      raise exception 'lesson_questions: una pregunta borrada no se vuelve a tocar' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.deleted_at is distinct from old.deleted_at then
    if new.title is distinct from old.title or new.body is distinct from old.body
       or new.resolved_at is distinct from old.resolved_at then
      raise exception 'lesson_questions: moderar no es editar' using errcode = '42501';
    end if;
    if not public.is_lesson_qa_moderator(old.course_id) then
      raise exception 'lesson_questions: borrar es de la docente del curso o del admin' using errcode = '42501';
    end if;
    if new.deleted_by is distinct from v_uid then
      raise exception 'lesson_questions: el borrado queda firmado por quien lo hizo' using errcode = '42501';
    end if;
    if new.deleted_reason is null or length(btrim(new.deleted_reason)) = 0 then
      raise exception 'lesson_questions: borrar exige un motivo' using errcode = '42501';
    end if;
    return new;
  end if;

  v_resolving := new.resolved_at is distinct from old.resolved_at;
  if v_resolving then
    if old.author_id is distinct from v_uid and not public.is_lesson_qa_moderator(old.course_id) then
      raise exception 'lesson_questions: resolver es de la autora, la docente o el admin' using errcode = '42501';
    end if;
    -- La firma y la hora las pone el servidor (patron de 0026): el cliente solo dice si o no.
    if new.resolved_at is null then
      new.resolved_by := null;
    else
      new.resolved_at := now();
      new.resolved_by := v_uid;
    end if;
  end if;

  -- Lo que no es resolver ni moderar es editar, y editar es de la autora. No se pregunta si el
  -- texto cambio: un no-op ajeno tambien se rechaza (leccion de 0014).
  if (not v_resolving or new.title is distinct from old.title or new.body is distinct from old.body)
     and old.author_id is distinct from v_uid then
    raise exception 'lesson_questions: solo quien pregunto edita su pregunta' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger lesson_questions_guard
  before insert or update or delete on public.lesson_questions
  for each row execute function public.guard_lesson_questions();

create or replace function public.guard_lesson_answers()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_uid       uuid := auth.uid();
  v_featuring boolean;
begin
  if public.is_service_context() then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    raise exception 'lesson_answers: borrar es soft delete, nunca DELETE' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    if new.author_id is distinct from v_uid then
      raise exception 'lesson_answers: author_id tiene que ser quien responde' using errcode = '42501';
    end if;
    if not exists (
      select 1 from public.lesson_questions q where q.id = new.question_id and q.deleted_at is null
    ) then
      raise exception 'lesson_answers: la pregunta fue borrada' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.id is distinct from old.id
     or new.author_id is distinct from old.author_id
     or new.created_at is distinct from old.created_at then
    raise exception 'lesson_answers: la identidad de la respuesta no se reescribe' using errcode = '42501';
  end if;

  if old.deleted_at is not null then
    if row(new.body, new.featured_at, new.featured_by, new.deleted_at, new.deleted_by, new.deleted_reason)
       is distinct from
       row(old.body, old.featured_at, old.featured_by, old.deleted_at, old.deleted_by, old.deleted_reason) then
      raise exception 'lesson_answers: una respuesta borrada no se vuelve a tocar' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.deleted_at is distinct from old.deleted_at then
    if new.body is distinct from old.body then
      raise exception 'lesson_answers: moderar no es editar' using errcode = '42501';
    end if;
    if not public.is_lesson_qa_moderator(old.course_id) then
      raise exception 'lesson_answers: borrar es de la docente del curso o del admin' using errcode = '42501';
    end if;
    if new.deleted_by is distinct from v_uid then
      raise exception 'lesson_answers: el borrado queda firmado por quien lo hizo' using errcode = '42501';
    end if;
    if new.deleted_reason is null or length(btrim(new.deleted_reason)) = 0 then
      raise exception 'lesson_answers: borrar exige un motivo' using errcode = '42501';
    end if;
    -- Una destacada borrada dejaria la pregunta sin poder destacar otra (indice unico parcial).
    new.featured_at := null;
    new.featured_by := null;
    return new;
  end if;

  v_featuring := new.featured_at is distinct from old.featured_at;
  if v_featuring then
    if not public.is_lesson_qa_moderator(old.course_id) then
      raise exception 'lesson_answers: destacar es de la docente del curso o del admin' using errcode = '42501';
    end if;
    if new.featured_at is null then
      new.featured_by := null;
    else
      if not old.is_instructor_answer then
        raise exception 'lesson_answers: solo se destaca una respuesta de la docente' using errcode = '42501';
      end if;
      new.featured_at := now();
      new.featured_by := v_uid;
    end if;
  end if;

  if (not v_featuring or new.body is distinct from old.body)
     and old.author_id is distinct from v_uid then
    raise exception 'lesson_answers: solo quien respondio edita su respuesta' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger lesson_answers_guard
  before insert or update or delete on public.lesson_answers
  for each row execute function public.guard_lesson_answers();

-- ================================================================ lectura auxiliar

-- Calcada de `campus_post_authors` (0014): el padron de alumnas no es publico (0004), asi que el
-- nombre de quien escribio se resuelve aca y solo para lo que quien pregunta puede leer.
create or replace function public.lesson_qa_authors(p_ids uuid[])
returns table(id uuid, full_name text, glyph text, role text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.full_name, p.glyph, p.role
  from public.profiles p
  where p.id = any(p_ids)
    and (
      exists (select 1 from public.lesson_questions q
              where q.author_id = p.id and public.can_read_lesson_qa(q.course_id, q.lesson_id))
      or exists (select 1 from public.lesson_answers a
                 where a.author_id = p.id and public.can_read_lesson_qa(a.course_id, a.lesson_id))
    );
$$;

-- Los votos son privados (solo se lee el propio); el conteo sale de aca.
create or replace function public.lesson_question_vote_counts(p_ids uuid[])
returns table(question_id uuid, votes integer)
language sql stable security definer set search_path = '' as $$
  select q.id,
         (select count(*)::int from public.lesson_question_votes v where v.question_id = q.id)
  from public.lesson_questions q
  where q.id = any(p_ids) and public.can_read_lesson_qa(q.course_id, q.lesson_id);
$$;

-- T-048 la consume. NO usa is_service_context(): dentro de un SECURITY DEFINER `current_user` es
-- el dueno de la funcion y daria true para cualquiera.
create or replace function public.course_open_questions(p_course_id uuid)
returns table(id uuid, lesson_id uuid, title text, created_at timestamptz, votes integer)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not (public.owns_course(p_course_id) or public.is_admin()) then
    raise exception 'course_open_questions: solo la docente del curso o el admin' using errcode = '42501';
  end if;
  return query
    select q.id, q.lesson_id, q.title, q.created_at,
           (select count(*)::int from public.lesson_question_votes v where v.question_id = q.id)
    from public.lesson_questions q
    where q.course_id = p_course_id
      and q.deleted_at is null
      and q.resolved_at is null
      and not exists (
        select 1 from public.lesson_answers a
        where a.question_id = q.id and a.is_instructor_answer and a.deleted_at is null
      )
    order by q.created_at;
end;
$$;

-- ================================================================ RLS

alter table public.lesson_questions      enable row level security;
alter table public.lesson_answers        enable row level security;
alter table public.lesson_question_votes enable row level security;

create policy lesson_questions_read on public.lesson_questions
  for select to authenticated
  using (public.can_read_lesson_qa(course_id, lesson_id));

create policy lesson_questions_insert on public.lesson_questions
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and resolved_at is null and resolved_by is null
    and deleted_at is null and deleted_by is null and deleted_reason is null
    and public.can_write_lesson_qa(course_id, lesson_id)
  );

-- USING ancho, como `campus_posts_update`: la fila legible llega al guard y el rechazo es un
-- 42501 explicito, no "0 filas, 200 OK".
create policy lesson_questions_update on public.lesson_questions
  for update to authenticated
  using (public.can_read_lesson_qa(course_id, lesson_id))
  with check (public.can_read_lesson_qa(course_id, lesson_id));

create policy lesson_answers_read on public.lesson_answers
  for select to authenticated
  using (public.can_read_lesson_qa(course_id, lesson_id));

create policy lesson_answers_insert on public.lesson_answers
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and featured_at is null and featured_by is null
    and deleted_at is null and deleted_by is null and deleted_reason is null
    and public.can_write_lesson_qa(course_id, lesson_id)
  );

create policy lesson_answers_update on public.lesson_answers
  for update to authenticated
  using (public.can_read_lesson_qa(course_id, lesson_id))
  with check (public.can_read_lesson_qa(course_id, lesson_id));

create policy lesson_question_votes_read_own on public.lesson_question_votes
  for select to authenticated using (user_id = (select auth.uid()));

create policy lesson_question_votes_insert_own on public.lesson_question_votes
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_vote_lesson_question(question_id));

create policy lesson_question_votes_delete_own on public.lesson_question_votes
  for delete to authenticated using (user_id = (select auth.uid()));

-- Sin policy de DELETE en preguntas ni respuestas: capa 2 de 3 contra el hard delete.

-- ================================================================ privilegios (R-1, whitelist)

revoke all on public.lesson_questions, public.lesson_answers, public.lesson_question_votes
  from anon, authenticated;

grant select (id, lesson_id, course_id, author_id, title, body, resolved_at, resolved_by,
              created_at, updated_at, deleted_at, deleted_by, deleted_reason)
  on public.lesson_questions to authenticated;
-- Sin course_id (lo deriva el trigger) y sin resolved_*/deleted_* (nadie nace resuelta ni borrada).
grant insert (lesson_id, author_id, title, body) on public.lesson_questions to authenticated;
-- Sin resolved_by: lo firma el guard.
grant update (title, body, resolved_at, deleted_at, deleted_by, deleted_reason)
  on public.lesson_questions to authenticated;

grant select (id, question_id, lesson_id, course_id, author_id, body, is_instructor_answer,
              featured_at, featured_by, created_at, updated_at, deleted_at, deleted_by, deleted_reason)
  on public.lesson_answers to authenticated;
-- Sin is_instructor_answer ni alcance: los deriva el trigger (criterio 4).
grant insert (question_id, author_id, body) on public.lesson_answers to authenticated;
-- Sin featured_by: lo firma el guard.
grant update (body, featured_at, deleted_at, deleted_by, deleted_reason)
  on public.lesson_answers to authenticated;

grant select (question_id, user_id, created_at) on public.lesson_question_votes to authenticated;
grant insert (question_id, user_id) on public.lesson_question_votes to authenticated;
grant delete on public.lesson_question_votes to authenticated;
-- Sin GRANT DELETE en preguntas ni respuestas: capa 1 de 3.

grant all on public.lesson_questions, public.lesson_answers, public.lesson_question_votes to service_role;

-- ================================================================ ejecucion (regla de 0005:153)

revoke execute on all functions in schema public from public;


grant execute on function public.can_read_lesson_qa(uuid, uuid)        to authenticated, service_role;
grant execute on function public.can_write_lesson_qa(uuid, uuid)       to authenticated, service_role;
grant execute on function public.is_lesson_qa_moderator(uuid)          to authenticated, service_role;
grant execute on function public.can_vote_lesson_question(uuid)        to authenticated, service_role;
grant execute on function public.lesson_qa_authors(uuid[])             to authenticated, service_role;
grant execute on function public.lesson_question_vote_counts(uuid[])   to authenticated, service_role;
grant execute on function public.course_open_questions(uuid)           to authenticated, service_role;

-- ================================================================ Campus: D-26 y la clase de 0017
--
-- E1 (cierra D-26). `campus_posts.deleted_reason` lo lee toda la cohorte del hilo y no tenia
-- ninguna de las dos mitades de R-3. Lo encontro el invariante de la clase "con sesion"
-- (tests/locator-session-class.test.mjs), que nacio en este ticket; ADR-010 (4) obliga a cubrir
-- en el mismo ticket lo que el invariante descubre.
alter table public.campus_posts
  add constraint campus_posts_deleted_reason_no_locator
  check (not public.text_has_locator(deleted_reason));

create trigger campus_posts_locator_guard
  before insert or update on public.campus_posts
  for each row execute function public.guard_locator_exacto('deleted_reason');

-- E2. El trio estricto de 0014 tiene el bug de 0017: `deleted_by` es `on delete set null` y la
-- baja de una moderadora violaba el CHECK, asi que su cuenta no se podia borrar. Mismo trio
-- relajado que las tablas de arriba; la firma la sigue exigiendo `guard_campus_posts` al moderar.
alter table public.campus_posts drop constraint campus_posts_deleted_consistency;
alter table public.campus_posts
  add constraint campus_posts_deleted_consistency check (
    (deleted_at is null) = (deleted_reason is null)
    and (deleted_by is null or deleted_at is not null)
  );

