-- T-049 · Invitaciones de docentes y listados paginados del admin
--
-- Hasta aca una docente nueva se registraba como alumna y esperaba que el admin le cambiara el
-- rol a mano. Una invitacion es un token de 32 bytes que vive SOLO en el mail; aca se guarda su
-- sha256. Aceptar exige una sesion cuyo mail CONFIRMADO coincide con el invitado (D8) y lo hace
-- una sola funcion que ningun cliente ejecuta.
--
-- Por que la tabla no tiene policies: nadie fuera del servidor la lee ni la escribe, igual que
-- mail_log (0019). El guard repite la regla para el dia en que alguien otorgue un grant "para
-- destrabar algo" (misma razon que 0005).

-- ---------------------------------------------------------------- 1 · tabla
create table public.teacher_invitations (
  id          uuid        primary key default gen_random_uuid(),
  email       text        not null,
  token_hash  text        not null,
  -- set null y no restrict: con restrict la cuenta del admin que invito no se podria borrar
  -- nunca. El guard exige autor al crear; nulo solo queda si esa cuenta desaparece.
  invited_by  uuid        references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid        references public.profiles (id) on delete set null,
  revoked_at  timestamptz,
  revoked_by  uuid        references public.profiles (id) on delete set null,
  constraint teacher_invitations_email_normalized
    check (email = lower(btrim(email)) and position('@' in email) > 1 and char_length(email) <= 320),
  constraint teacher_invitations_token_hash_key unique (token_hash),
  constraint teacher_invitations_token_hash_shape check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint teacher_invitations_expires_after_created check (expires_at > created_at),
  -- Asimetricos a proposito: el *_by puede quedar nulo cuando se borra la cuenta, el *_at no.
  -- Un CHECK (a is null) = (b is null) mas on delete set null hace imborrable la cuenta: es el
  -- bug de 0017 y el que T-037 midio en course_reviews_hidden_consistency.
  constraint teacher_invitations_accept_consistency check (accepted_by is null or accepted_at is not null),
  constraint teacher_invitations_revoke_consistency check (revoked_by is null or revoked_at is not null),
  constraint teacher_invitations_one_outcome check (accepted_at is null or revoked_at is null)
);

-- Una pendiente por mail (SP-4 c.7). Una vencida sin resolver tambien cuenta como pendiente:
-- "reenviar" la revoca y crea otra, asi el token viejo muere siempre.
create unique index teacher_invitations_pending_email
  on public.teacher_invitations (email) where accepted_at is null and revoked_at is null;
create index teacher_invitations_created_idx on public.teacher_invitations (created_at desc, id desc);

alter table public.teacher_invitations enable row level security;
revoke all on public.teacher_invitations from public, anon, authenticated;
-- Explicito: 0007 midio que service_role no hereda privilegios sobre tablas nuevas en todos los entornos.
grant select, insert, update, delete on public.teacher_invitations to service_role;

-- ---------------------------------------------------------------- 2 · guard
-- SECURITY INVOKER: dentro de un definer current_user seria el owner y el guard se eximiria.
create or replace function public.guard_teacher_invitations()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_service_context() then
    raise exception 'teacher_invitations solo la escribe el servidor (T-049)' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    if new.accepted_at is not null or new.accepted_by is not null
       or new.revoked_at is not null or new.revoked_by is not null then
      raise exception 'una invitacion nace pendiente' using errcode = '22023';
    end if;
    if new.invited_by is null then
      raise exception 'una invitacion nace con quien la envio' using errcode = '22023';
    end if;
    return new;
  end if;

  if new.email is distinct from old.email
     or new.token_hash is distinct from old.token_hash
     or new.created_at is distinct from old.created_at
     or new.expires_at is distinct from old.expires_at then
    raise exception 'mail, token, creacion y vencimiento no cambian' using errcode = '22023';
  end if;

  -- Las tres referencias solo pueden ir a nulo (on delete set null), nunca a otra persona.
  if new.invited_by is distinct from old.invited_by and new.invited_by is not null then
    raise exception 'invited_by solo puede quedar nulo' using errcode = '22023';
  end if;

  if new.accepted_at is distinct from old.accepted_at then
    if old.accepted_at is not null or old.revoked_at is not null then
      raise exception 'la invitacion ya se resolvio' using errcode = '22023';
    end if;
    if old.expires_at <= now() then
      raise exception 'la invitacion vencio' using errcode = '22023';
    end if;
  elsif new.accepted_by is distinct from old.accepted_by and new.accepted_by is not null then
    raise exception 'accepted_by solo cambia al aceptar' using errcode = '22023';
  end if;

  if new.revoked_at is distinct from old.revoked_at then
    if old.accepted_at is not null or old.revoked_at is not null then
      raise exception 'la invitacion ya se resolvio' using errcode = '22023';
    end if;
  elsif new.revoked_by is distinct from old.revoked_by and new.revoked_by is not null then
    raise exception 'revoked_by solo cambia al revocar' using errcode = '22023';
  end if;

  return new;
end;
$$;

create trigger teacher_invitations_guard
  before insert or update on public.teacher_invitations
  for each row execute function public.guard_teacher_invitations();

-- 0002: Supabase otorga EXECUTE a PUBLIC en toda funcion nueva de public; un trigger no se llama.
revoke execute on function public.guard_teacher_invitations() from public, anon, authenticated;

-- ---------------------------------------------------------------- 3 · aceptar
-- SECURITY DEFINER: lee auth.users (mail y confirmacion) y corre como owner, que el guard y
-- profiles_guard reconocen como servidor. Solo service_role la ejecuta; p_user_id lo pone el
-- Route Handler desde la sesion validada (getUser), nunca un parametro del request.
--
-- Devuelve false sin escribir nada en todo caso que no sea el legitimo, sin decir cual: ajena,
-- vencida, revocada, inexistente y sin confirmar se ven igual desde afuera (SP-4 c.3, c.4).
create or replace function public.accept_teacher_invitation(p_token_hash text, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inv   public.teacher_invitations%rowtype;
  v_email text;
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' or p_user_id is null then
    return false;
  end if;

  select u.email into v_email
    from auth.users u
   where u.id = p_user_id and u.email_confirmed_at is not null;
  if v_email is null then
    return false;
  end if;

  -- for update: dos aperturas simultaneas del mismo link se serializan aca.
  select * into v_inv
    from public.teacher_invitations i
   where i.token_hash = p_token_hash
   for update;
  if not found or v_inv.email <> lower(btrim(v_email)) then
    return false;
  end if;

  if v_inv.accepted_at is not null then
    -- Idempotente para quien ya acepto (recargar el link); "no valida" para cualquier otra cuenta.
    return coalesce(v_inv.accepted_by = p_user_id, false);
  end if;
  if v_inv.revoked_at is not null or v_inv.expires_at <= now() then
    return false;
  end if;

  update public.teacher_invitations
     set accepted_at = now(), accepted_by = p_user_id
   where id = v_inv.id;

  -- Solo sube una alumna: una admin o una docente que acepta conserva su rol (SP-4 c.10).
  update public.profiles
     set role = 'teacher'
   where id = p_user_id and role = 'student';

  return true;
end;
$$;

revoke execute on function public.accept_teacher_invitation(text, uuid) from public, anon, authenticated;
grant  execute on function public.accept_teacher_invitation(text, uuid) to service_role;

-- ---------------------------------------------------------------- 4 · listados del admin
-- La busqueda va en la base porque el mail vive en auth.users y hasta T-049 listAllUsers lo
-- juntaba en memoria trayendo TODAS las cuentas. Keyset y no offset: una fila nueva no corre la
-- pagina siguiente. El orden incluye id para desempatar created_at repetido (dos altas en la
-- misma transaccion comparten now()).

create or replace function public.admin_like_pattern(p_q text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when nullif(btrim(coalesce(p_q, '')), '') is null then null
    else '%' || replace(replace(replace(btrim(p_q), '\', '\\'), '%', '\%'), '_', '\_') || '%'
  end;
$$;

create or replace function public.admin_list_users(
  p_q text default null, p_after_at timestamptz default null, p_after_id uuid default null, p_limit integer default 26
)
returns table (id uuid, full_name text, email text, role text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.full_name, u.email::text, p.role, p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    cross join (select public.admin_like_pattern(p_q) as v) pat
   where (pat.v is null or p.full_name ilike pat.v or u.email ilike pat.v)
     and (p_after_at is null or p_after_id is null or (p.created_at, p.id) < (p_after_at, p_after_id))
   order by p.created_at desc, p.id desc
   limit least(greatest(coalesce(p_limit, 26), 1), 101);
$$;

create or replace function public.admin_list_courses(
  p_q text default null, p_after_at timestamptz default null, p_after_id uuid default null, p_limit integer default 26
)
returns table (id uuid, slug text, title text, status text, teacher_name text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.slug, c.title, c.status, t.full_name, c.created_at
    from public.courses c
    join public.profiles t on t.id = c.teacher_id
    cross join (select public.admin_like_pattern(p_q) as v) pat
   where (pat.v is null or c.title ilike pat.v or c.slug ilike pat.v or t.full_name ilike pat.v)
     and (p_after_at is null or p_after_id is null or (c.created_at, c.id) < (p_after_at, p_after_id))
   order by c.created_at desc, c.id desc
   limit least(greatest(coalesce(p_limit, 26), 1), 101);
$$;

-- Sin 'requested': la cola de T-043 las muestra arriba con sus botones. enrollments no tiene
-- created_at; enrolled_at nace con la fila (0001) y sirve de clave igual.
create or replace function public.admin_list_enrollments(
  p_q text default null, p_after_at timestamptz default null, p_after_id uuid default null, p_limit integer default 26
)
returns table (
  id uuid, user_id uuid, user_name text, user_email text, course_id uuid, course_title text,
  status text, enrolled_at timestamptz, decided_reason text, granted_by_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.user_id, s.full_name, u.email::text, e.course_id, c.title,
         e.status, e.enrolled_at, e.decided_reason, g.full_name
    from public.enrollments e
    join public.profiles s on s.id = e.user_id
    join auth.users u on u.id = e.user_id
    join public.courses c on c.id = e.course_id
    left join public.profiles g on g.id = e.granted_by
    cross join (select public.admin_like_pattern(p_q) as v) pat
   where e.status <> 'requested'
     and (pat.v is null or s.full_name ilike pat.v or u.email ilike pat.v or c.title ilike pat.v)
     and (p_after_at is null or p_after_id is null or (e.enrolled_at, e.id) < (p_after_at, p_after_id))
   order by e.enrolled_at desc, e.id desc
   limit least(greatest(coalesce(p_limit, 26), 1), 101);
$$;

create or replace function public.admin_list_invitations(
  p_q text default null, p_after_at timestamptz default null, p_after_id uuid default null, p_limit integer default 26
)
returns table (
  id uuid, email text, created_at timestamptz, expires_at timestamptz,
  accepted_at timestamptz, revoked_at timestamptz, invited_by_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id, i.email, i.created_at, i.expires_at, i.accepted_at, i.revoked_at, p.full_name
    from public.teacher_invitations i
    left join public.profiles p on p.id = i.invited_by
    cross join (select public.admin_like_pattern(p_q) as v) pat
   where (pat.v is null or i.email ilike pat.v)
     and (p_after_at is null or p_after_id is null or (i.created_at, i.id) < (p_after_at, p_after_id))
   order by i.created_at desc, i.id desc
   limit least(greatest(coalesce(p_limit, 26), 1), 101);
$$;

-- Para inscribir por mail (el formulario ya no recibe la lista entera) y para no invitar a
-- quien ya es docente o admin.
create or replace function public.admin_user_by_email(p_email text)
returns table (id uuid, role text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.role
    from auth.users u
    join public.profiles p on p.id = u.id
   where lower(u.email) = lower(btrim(p_email))
   limit 1;
$$;

-- ---------------------------------------------------------------- 5 · privilegios de funciones
-- 0002: Supabase otorga EXECUTE a anon y authenticated en toda funcion nueva de public. Se
-- revoca de los tres y se otorga solo a service_role.
revoke execute on function public.admin_like_pattern(text)                                    from public, anon, authenticated;
revoke execute on function public.admin_list_users(text, timestamptz, uuid, integer)          from public, anon, authenticated;
revoke execute on function public.admin_list_courses(text, timestamptz, uuid, integer)        from public, anon, authenticated;
revoke execute on function public.admin_list_enrollments(text, timestamptz, uuid, integer)    from public, anon, authenticated;
revoke execute on function public.admin_list_invitations(text, timestamptz, uuid, integer)    from public, anon, authenticated;
revoke execute on function public.admin_user_by_email(text)                                   from public, anon, authenticated;
grant  execute on function public.admin_like_pattern(text)                                    to service_role;
grant  execute on function public.admin_list_users(text, timestamptz, uuid, integer)          to service_role;
grant  execute on function public.admin_list_courses(text, timestamptz, uuid, integer)        to service_role;
grant  execute on function public.admin_list_enrollments(text, timestamptz, uuid, integer)    to service_role;
grant  execute on function public.admin_list_invitations(text, timestamptz, uuid, integer)    to service_role;
grant  execute on function public.admin_user_by_email(text)                                   to service_role;
