-- T-001 · Triggers de guarda — defensa en profundidad sobre 0003
--
-- El revoke por columna de 0003 ya alcanza por si solo (PostgREST devuelve 42501 ANTES de
-- evaluar RLS). Estos triggers existen para el dia en que alguien agregue un
-- `grant update on public.profiles to authenticated` "para destrabar algo" y no lo note.
--
-- SECURITY INVOKER a proposito: dentro de una funcion SECURITY DEFINER `current_user` pasa a ser
-- el owner, y el guard se auto-eximiria siempre.
--
-- `set search_path = ''` igual en todas, aunque sean INVOKER: la higiene es de la CLASE funcion,
-- no del modo de seguridad. Hoy el riesgo es nulo (authenticated no tiene CREATE en ningun
-- esquema), pero la regla "toda funcion de public fija su search_path" es verificable de una
-- sola pasada sobre pg_proc, y la excepcion caso-por-caso no. Todo lo que se referencia queda
-- calificado: `public.*` y `pg_catalog.*`.

create or replace function public.is_service_context()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select r.rolbypassrls from pg_catalog.pg_roles r where r.rolname = current_user),
    false
  ) or current_user in ('postgres', 'service_role', 'supabase_admin', 'supabase_auth_admin');
$$;

-- ---------------------------------------------------------------- profiles.role congelado
create or replace function public.guard_profiles()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and not public.is_service_context() then
    raise exception 'profiles.role solo lo cambia service_role (T-008)'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_guard
  before update on public.profiles
  for each row execute function public.guard_profiles();

-- ---------------------------------------------------------------- courses.status congelado
create or replace function public.guard_courses()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_service_context() then
    return new;
  end if;
  if new.status is distinct from old.status then
    raise exception 'courses.status solo lo cambia service_role (publicar/despublicar)'
      using errcode = '42501';
  end if;
  if new.teacher_id is distinct from old.teacher_id then
    raise exception 'courses.teacher_id no se reasigna desde el cliente'
      using errcode = '42501';
  end if;
  if new.featured is distinct from old.featured then
    raise exception 'courses.featured es curaduria, no lo decide el docente'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger courses_guard
  before update on public.courses
  for each row execute function public.guard_courses();

-- ---------------------------------------------------------------- enrollments intocable
create or replace function public.guard_enrollments()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_service_context() then
    raise exception 'enrollments solo se escribe con service_role (alta manual por admin, T-008)'
      using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger enrollments_guard
  before insert or update or delete on public.enrollments
  for each row execute function public.guard_enrollments();

-- ---------------------------------------------------------------- progreso monotono
-- Race real: el player escribe con throttle desde N pestañas. Sin esto, la pestaña lenta
-- pisa el avance de la rapida y la barra retrocede; y una leccion completada se "descompleta".
create or replace function public.guard_lesson_progress()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.seconds_watched := greatest(new.seconds_watched, old.seconds_watched);
  if old.completed then
    new.completed    := true;
    new.completed_at := old.completed_at;
  end if;
  new.last_seen_at := greatest(new.last_seen_at, old.last_seen_at);
  return new;
end;
$$;

create trigger lesson_progress_monotonic
  before update on public.lesson_progress
  for each row execute function public.guard_lesson_progress();

-- ---------------------------------------------------------------- published_at coherente
-- El CHECK courses_published_at_matches_status exige la pareja; esto la mantiene sin que
-- el Server Action tenga que acordarse.
create or replace function public.sync_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  elsif new.status is distinct from 'published' then
    new.published_at := null;
  end if;
  return new;
end;
$$;

create trigger courses_sync_published_at
  before insert or update on public.courses
  for each row execute function public.sync_published_at();

-- ---------------------------------------------------------------- privilegios de ejecucion
--
-- Postgres otorga EXECUTE a PUBLIC en toda funcion nueva. Es un default del CORE, no una
-- entrada de default privileges: por eso `alter default privileges ... revoke all on functions`
-- (0003:18) no lo saca, y el revoke en bloque de 0002:158 corre antes de que estas seis existan.
-- Sin esta linea las funciones de este archivo quedaban con EXECUTE para PUBLIC, o sea para
-- anon y authenticated, contradiciendo la postura declarada en 0002.
--
-- Revocar de `public` (el pseudo-rol) no toca los grants EXPLICITOS a anon/authenticated que
-- 0002:164-170 otorga a los helpers de policy: por eso el revoke puede ser en bloque y sin
-- lista, y sirve igual para cualquier funcion que agregue una migracion futura.
--
-- REGLA: toda migracion que cree funciones termina con este revoke.
revoke execute on all functions in schema public from public;

-- Unica excepcion: `is_service_context()` se invoca DESDE el cuerpo de los guards, que son
-- SECURITY INVOKER — corren como el rol que escribe, y ahi Postgres si chequea EXECUTE en
-- tiempo de ejecucion. Sin este grant, el UPDATE legitimo de un alumno sobre su propio perfil
-- moriria con 42501 en el trigger. (Las otras cinco no lo necesitan: disparar un trigger no
-- chequea EXECUTE sobre la funcion del trigger — el permiso se valida al CREATE TRIGGER.)
grant execute on function public.is_service_context() to authenticated, service_role;
