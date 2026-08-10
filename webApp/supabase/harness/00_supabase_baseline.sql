-- Harness · replica de la linea de base de un proyecto Supabase RECIEN CREADO.
-- NO se aplica a un proyecto Supabase real: alli todo esto ya existe.
-- Existe para que el test de mutacion corra contra las MISMAS condiciones iniciales,
-- incluida la que causo SEC-01 en `fixia`: el ALTER DEFAULT PRIVILEGES permisivo.
-- Si este archivo fuera "seguro por defecto", el test pasaria en vacio.

-- ---------------------------------------------------------------- roles
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    create role supabase_auth_admin nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then
    create role authenticator noinherit;
  end if;
end;
$$;

grant anon, authenticated, service_role to authenticator;

-- ---------------------------------------------------------------- esquema auth
create schema if not exists auth;

create table if not exists auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text unique,
  raw_user_meta_data jsonb not null default '{}',
  raw_app_meta_data  jsonb not null default '{}',
  created_at         timestamptz not null default now()
);

-- Misma implementacion que usa Supabase: leen el JSON de claims que PostgREST deja
-- en el GUC `request.jwt.claims` al abrir la transaccion.
create or replace function auth.jwt()
returns jsonb
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb,
    '{}'::jsonb
  );
$$;

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid;
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select auth.jwt() ->> 'role';
$$;

grant usage on schema auth to anon, authenticated, service_role, supabase_auth_admin;
grant select on auth.users to service_role, supabase_auth_admin;

-- ---------------------------------------------------------------- esquema public: defaults permisivos
-- ESTA es la condicion de SEC-01. Tal cual la trae un proyecto Supabase nuevo.
grant usage on schema public to anon, authenticated, service_role;

alter default privileges in schema public
  grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to postgres, anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to postgres, anon, authenticated, service_role;
