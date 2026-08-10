-- T-001 · Helpers de autorizacion + hook del claim de rol (ADR-002, criterio 6)
--
-- Autoridad del rol: la COLUMNA `profiles.role`, NO el claim del JWT.
-- El claim `user_role` es una foto tomada al emitir el token y queda rancia hasta el refresh
-- (1 h por defecto): si un admin degrada a un docente, su JWT lo sigue diciendo `teacher`.
-- Por eso todo helper de RLS lee la tabla. El claim solo sirve para ruteo/UI optimista.

-- ---------------------------------------------------------------- helpers de rol

-- SECURITY DEFINER: leer profiles desde una policy DE profiles recursaria.
-- search_path fijado a vacio: sin esto, un rol con CREATE en un esquema del search_path
-- podria secuestrar la resolucion de nombres dentro de una funcion que corre como owner.
create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_app_role() = 'admin', false);
$$;

create or replace function public.can_author()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_app_role() in ('teacher', 'admin'), false);
$$;

-- ---------------------------------------------------------------- helpers de acceso a curso

create or replace function public.owns_course(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.courses c
    where c.id = p_course_id and c.teacher_id = auth.uid()
  );
$$;

create or replace function public.can_read_course(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.courses c
    where c.id = p_course_id
      and (c.status = 'published' or c.teacher_id = auth.uid())
  ) or public.is_admin();
$$;

-- Inscripcion ACTIVA. 'revoked' no da acceso: la fila sigue existiendo por el UNIQUE(user,course),
-- reinscribir es un UPDATE a 'active' y solo lo hace service_role (T-008).
create or replace function public.has_course_access(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.enrollments e
    where e.course_id = p_course_id
      and e.user_id = auth.uid()
      and e.status = 'active'
  );
$$;

create or replace function public.lesson_is_preview(p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.lessons l
    where l.id = p_lesson_id and l.is_preview and l.is_published
  );
$$;

-- ---------------------------------------------------------------- alta de usuario

-- El rol se fija a 'student' LITERAL. Nunca se lee de raw_user_meta_data:
-- ese objeto lo controla el cliente en el signup publico de Supabase; tomarlo de ahi
-- seria auto-promocion a admin en un POST.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (new.id, 'student', coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- claim de rol en el JWT

-- Custom Access Token Hook (Supabase Auth > Hooks, o config.toml
--   [auth.hook.custom_access_token] enabled = true
--   uri = "pg-functions://postgres/public/custom_access_token_hook").
-- Inyecta `user_role` en el access token para que el servidor rutee sin ir a la DB.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role   text;
  v_claims jsonb;
begin
  select p.role into v_role
  from public.profiles p
  where p.id = (event ->> 'user_id')::uuid;

  v_claims := coalesce(event -> 'claims', '{}'::jsonb);
  v_claims := jsonb_set(v_claims, '{user_role}', to_jsonb(coalesce(v_role, 'student')));

  return jsonb_set(event, '{claims}', v_claims);
end;
$$;

-- ---------------------------------------------------------------- privilegios de ejecucion

-- Supabase trae ALTER DEFAULT PRIVILEGES que otorga EXECUTE a anon/authenticated en toda
-- funcion nueva de `public`. Se revoca en bloque y se re-otorga lo justo.
revoke execute on all functions in schema public from public, anon, authenticated;

-- anon tambien necesita EXECUTE en los helpers que aparecen en policies `to anon, authenticated`:
-- la policy se evalua con los privilegios de quien consulta, y sin EXECUTE el SELECT publico
-- del catalogo falla con 42501 en vez de devolver filas. Para un JWT ausente devuelven
-- null/false (auth.uid() es null), asi que no filtran nada.
grant execute on function public.current_app_role()             to anon, authenticated, service_role;
grant execute on function public.is_admin()                     to anon, authenticated, service_role;
grant execute on function public.can_author()                   to authenticated, service_role;
grant execute on function public.owns_course(uuid)              to anon, authenticated, service_role;
grant execute on function public.can_read_course(uuid)          to anon, authenticated, service_role;
grant execute on function public.has_course_access(uuid)        to authenticated, service_role;
grant execute on function public.lesson_is_preview(uuid)        to anon, authenticated, service_role;

-- El hook solo lo llama GoTrue. Nadie mas debe poder invocarlo.
revoke execute on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;
grant  usage   on schema   public                                 to supabase_auth_admin;
grant  execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
