-- T-043 · Inscripcion por solicitud (SP-2, D2). La alumna pide un curso desde la ficha; la
-- inscripcion nace `requested` y activarla sigue siendo privilegio de service_role (el admin
-- aprueba desde su panel; cuando lleguen los pagos, el webhook ocupa ese lugar, D1).
--
-- POR QUE EN `enrollments.status` Y NO EN UNA TABLA APARTE. Todo lo que da acceso
-- (`has_course_access`, `course_student_count`, `enrollments_active_idx`, `enrollment.ts`,
-- `reviews.ts`, `campus.ts`) filtra `status = 'active'` explicitamente: una fila `requested` es
-- invisible para el acceso sin tocar una linea. Y el UNIQUE (user_id, course_id) que ya existe es
-- lo que impide pedir dos veces o pedir lo que ya se tiene.
--
-- ADR-008 se APLICA, no se cambia: el cliente gana un INSERT, asi que el INSERT es whitelist de
-- columnas (`user_id`, `course_id`) MAS un guard de estado. La enumeracion final del ADR ("enrollments
-- no tiene INSERT desde el cliente") se corrige en 02_architecture.md como nota de T-043.
--
-- Checklist ADR-011 (los dos guards de esta tabla):
--   1 · Operacion legitima: la alumna inserta SU solicitud (probado en guard-reachability y en
--       enrollment-requests); el admin, via service_role, aprueba, rechaza con motivo, reconsidera
--       un rechazo y revoca (probado en guard-reachability).
--   2 · Bypass de service_role: SI en el estado (es un PERMISO). NO en el localizador exacto del
--       motivo (es un INVARIANTE: lo escribe justamente service_role y lo lee la alumna).
--   3 · Dos actores con el mismo rol sobre la fila: no aplica. Solo la duenia inserta (policy) y
--       nadie que no sea service_role actualiza.
--   4 · INSERT y UPDATE: cubiertos los dos, y DELETE sigue bajo el guard de 0005.
--   5 · Valor sin cambio: el guard de INSERT no compara contra nada; el de UPDATE corta cualquier
--       UPDATE de cliente, cambie o no el valor (no hay ningun UPDATE de cliente legitimo).

-- ---------------------------------------------------------------- estados y columnas
alter table public.enrollments drop constraint enrollments_status_check;

-- El default pasa a 'requested': una inscripcion nace pedida, igual que un curso nace en draft.
-- Todo INSERT existente pasa `status` explicito (seed.sql, harness, setEnrollmentAction); el de
-- tests/seed.mjs se corrigio en este mismo ticket.
alter table public.enrollments
  add constraint enrollments_status_check
    check (status in ('requested', 'active', 'revoked', 'rejected')),
  alter column status set default 'requested',
  add column requested_at   timestamptz,
  add column decided_at     timestamptz,
  add column decided_reason text,
  add constraint enrollments_requested_has_timestamp
    check (status <> 'requested' or requested_at is not null),
  -- El motivo explica un NO. En una fila activa no significa nada y quedaria colgado si alguien
  -- reactiva sin limpiarlo: el CHECK obliga al servidor a limpiarlo en la misma sentencia.
  add constraint enrollments_decided_reason_consistency
    check (decided_reason is null or status in ('rejected', 'revoked')),
  add constraint enrollments_decided_reason_not_blank
    check (decided_reason is null or char_length(btrim(decided_reason)) > 0),
  add constraint enrollments_decided_reason_max_length
    check (char_length(decided_reason) <= 500),
  -- R-3 mitad de FORMA. La mitad EXACTA vive en los guards de abajo.
  add constraint enrollments_decided_reason_no_locator
    check (not public.text_has_locator(decided_reason));

-- ---------------------------------------------------------------- mail_log
-- El CHECK de 0019:93 es cerrado. Sin 'enrollment_rejected' el reclamo del mail de rechazo falla
-- y la dedupe no puede existir. Sin `if exists` a proposito: si el nombre no fuera este, la
-- migracion tiene que fallar, no dejar el CHECK viejo puesto en silencio.
alter table public.mail_log drop constraint mail_log_mail_type_check;
alter table public.mail_log add constraint mail_log_mail_type_check
  check (mail_type in ('welcome', 'enrollment_granted', 'course_completed', 'teacher_new_student',
                       'enrollment_rejected'));

-- ---------------------------------------------------------------- privilegios (R-1)
-- `revoke insert` de tabla antes del grant por columna: misma secuencia que 0003, por si algun
-- default de Supabase dejo un INSERT de tabla vivo.
revoke insert on public.enrollments from authenticated;
grant insert (user_id, course_id) on public.enrollments to authenticated;
-- La alumna lee la fecha de su pedido y el motivo de un rechazo. Sigue sin UPDATE ni DELETE.
grant select (requested_at, decided_at, decided_reason) on public.enrollments to authenticated;

-- ---------------------------------------------------------------- RLS
-- Solo la propia fila y solo sobre un curso publicado. La subconsulta corre con la RLS de
-- `courses`, que ya oculta los borradores ajenos; el `status = 'published'` corta tambien el
-- borrador propio de una docente.
create policy enrollments_insert_own_request on public.enrollments
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.courses c
      where c.id = enrollments.course_id and c.status = 'published'
    )
  );

-- ---------------------------------------------------------------- guard de INSERT
create or replace function public.guard_enrollments_insert()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if public.body_has_known_locator(coalesce(new.decided_reason, '')) then
    raise exception 'el motivo contiene un localizador de contenido pago'
      using errcode = '42501';
  end if;

  if public.is_service_context() then
    if new.status = 'requested' then
      new.requested_at := coalesce(new.requested_at, now());
    end if;
    return new;
  end if;

  if new.status is distinct from 'requested' then
    raise exception 'una inscripcion nace solicitada: activarla es privilegio de service_role (T-043)'
      using errcode = '42501';
  end if;

  -- Ninguna de estas columnas esta en el grant de INSERT. Se pisan igual: el dia que alguien las
  -- agregue "para destrabar algo", la fila sigue naciendo sin otorgante y sin decision.
  new.granted_by     := null;
  new.enrolled_at    := now();
  new.requested_at   := now();
  new.decided_at     := null;
  new.decided_reason := null;
  return new;
end;
$$;

create trigger enrollments_guard_insert
  before insert on public.enrollments
  for each row execute function public.guard_enrollments_insert();

-- ---------------------------------------------------------------- guard de UPDATE/DELETE
-- Mismo trigger de 0005 (`enrollments_guard`), ahora solo UPDATE y DELETE: el INSERT lo arbitra
-- el guard de arriba. Es la segunda capa sobre la ausencia de grant de UPDATE: cubre "requested a
-- active" aunque alguien destrabe el grant.
create or replace function public.guard_enrollments()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and public.body_has_known_locator(coalesce(new.decided_reason, '')) then
    raise exception 'el motivo contiene un localizador de contenido pago'
      using errcode = '42501';
  end if;
  if not public.is_service_context() then
    raise exception 'enrollments solo cambia de estado con service_role (T-008, T-043)'
      using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger enrollments_guard on public.enrollments;
create trigger enrollments_guard
  before update or delete on public.enrollments
  for each row execute function public.guard_enrollments();

-- Regla 0005:153: toda migracion que crea funciones termina con este revoke.
revoke execute on all functions in schema public from public;
