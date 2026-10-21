-- T-042 · Perfil editable: telefono, fecha de nacimiento y avatar (D6, cierra Q-11).
--
-- POR QUE `phone` Y `birth_date` NO TIENEN GRANT DE SELECT. Un grant de columna no distingue
-- filas, y `profiles_read_public` (0004) deja leer las filas de docentes y admins a cualquiera,
-- `anon` incluido. Con `grant select (phone)` el telefono de toda docente seria publico. La
-- lectura propia pasa por `my_private_profile()`, que filtra por `auth.uid()`. Ni la duena las
-- lee por select directo: una sola via es una sola cosa que auditar.
--
-- Los grants viven aca y no en 0003 por la misma razon que 0011: una migracion aplicada no se
-- reescribe. La friccion de R-1 se conserva igual: ninguna columna sale sin su linea.

alter table public.profiles
  add column phone       text,
  add column birth_date  date,
  add column avatar_path text;

alter table public.profiles
  add constraint profiles_phone_format
    check (phone is null or phone ~ '^\+?[0-9][0-9 ()-]{5,19}$'),
  add constraint profiles_birth_date_range
    check (birth_date is null or (birth_date > date '1900-01-01' and birth_date <= current_date)),
  -- `avatar_path` lo lee `anon` y lo escribe la duena: es de la clase de ADR-009. El regex cierra
  -- el dominio (dos uuid y una extension de lista) y por eso basta como mitad de FORMA; se llama
  -- `_no_locator` para que el invariante de `locator-free-text` lo cuente como cubierto. El nombre
  -- de archivo es uuid estricto y no `[a-z0-9-]+`: lo genera el servidor, y un nombre libre es
  -- espacio para esconder texto en una columna publica.
  add constraint profiles_avatar_path_no_locator
    check (avatar_path is null or avatar_path ~
      '^avatars/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$');

-- `avatar_path` se lee: es un path opaco, no un dato personal, y la ficha publica lo necesita
-- para firmar la URL. La imagen en si sigue detras del bucket privado.
grant select (avatar_path) on public.profiles to anon, authenticated;
grant update (phone, birth_date, avatar_path) on public.profiles to authenticated;

-- ---------------------------------------------------------------- lectura propia
create or replace function public.my_private_profile()
returns table (phone text, birth_date date)
language sql
stable
security definer
set search_path = ''
as $$
  select p.phone, p.birth_date
    from public.profiles p
   where p.id = auth.uid();
$$;

-- ---------------------------------------------------------------- guard de carpeta del avatar
-- Checklist ADR-011:
--   1. Operacion legitima: la duena apunta `avatar_path` a un objeto suyo o lo vacia
--      (`uploadAvatarAction`/`removeAvatarAction`, cliente de sesion). El alta (`handle_new_user`)
--      inserta con `avatar_path` null.
--   2. Bypass de service_role: NO. Es invariante ("el avatar de X vive en la carpeta de X"), no un
--      permiso: no hay actor legitimo que necesite romperlo.
--   3. Dos actores, un rol, la misma fila: no. `profiles_update_self` solo deja escribir la propia.
--   4. INSERT y UPDATE: los dos.
--   5. Valor sin cambio: se re-chequea igual; la columna nace hoy, no hay filas viejas que fallen.
-- Sin esto, una usuaria apunta su avatar al archivo de otra y la ficha publica firma una imagen
-- ajena con service_role.
-- SECURITY INVOKER por la convencion de 0005, aunque no consulta `current_user`.
create or replace function public.guard_profiles_avatar_path()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.avatar_path is not null
     and not pg_catalog.starts_with(new.avatar_path, 'avatars/' || new.id::text || '/') then
    raise exception 'profiles.avatar_path tiene que estar en la carpeta del propio perfil'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_avatar_path_guard
  before insert or update on public.profiles
  for each row execute function public.guard_profiles_avatar_path();

-- ---------------------------------------------------------------- ADR-010: la mitad EXACTA
-- `avatar_path` entra a la clase, asi que entra al guard exacto con la lista completa. Hoy el regex
-- ya deja muy poco lugar, pero ADR-010 existe porque "lo cubre otra cosa" fue el argumento con el
-- que 0023 dejo cinco columnas afuera.
drop trigger profiles_locator_guard on public.profiles;
create trigger profiles_locator_guard
  before insert or update on public.profiles
  for each row execute function public.guard_locator_exacto(
    'full_name', 'bio', 'slug', 'glyph', 'headline', 'location', 'quote', 'avatar_path'
  );

-- ---------------------------------------------------------------- Storage (S-D)
-- PGlite no trae el schema `storage`: el bloque se saltea y la suite no prueba estas policies.
-- Las verifica el harness HTTP (b1, casos p6). El bucket es compartido con T-047 (`covers/`):
-- 5 MiB y tres tipos es el techo del bucket; el tope de 2 MB del avatar lo impone el servidor.
-- Los limites van tambien aca y no solo en config.toml, que solo rige en local.
do $$
begin
  if to_regclass('storage.objects') is null then
    raise notice 'T-042: sin schema storage (PGlite); bucket y policies no se crean';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('uploads', 'uploads', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do update
    set public = false,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

  execute 'drop policy if exists uploads_avatars_select_own on storage.objects';
  execute 'drop policy if exists uploads_avatars_insert_own on storage.objects';
  execute 'drop policy if exists uploads_avatars_update_own on storage.objects';
  execute 'drop policy if exists uploads_avatars_delete_own on storage.objects';

  -- La lectura publica del avatar no pasa por aca: la firma service_role en el servidor.
  execute $p$
    create policy uploads_avatars_select_own on storage.objects
      for select to authenticated
      using (bucket_id = 'uploads'
             and (storage.foldername(name))[1] = 'avatars'
             and (storage.foldername(name))[2] = (select auth.uid())::text)
  $p$;
  execute $p$
    create policy uploads_avatars_insert_own on storage.objects
      for insert to authenticated
      with check (bucket_id = 'uploads'
                  and (storage.foldername(name))[1] = 'avatars'
                  and (storage.foldername(name))[2] = (select auth.uid())::text)
  $p$;
  execute $p$
    create policy uploads_avatars_update_own on storage.objects
      for update to authenticated
      using (bucket_id = 'uploads'
             and (storage.foldername(name))[1] = 'avatars'
             and (storage.foldername(name))[2] = (select auth.uid())::text)
      with check (bucket_id = 'uploads'
                  and (storage.foldername(name))[1] = 'avatars'
                  and (storage.foldername(name))[2] = (select auth.uid())::text)
  $p$;
  execute $p$
    create policy uploads_avatars_delete_own on storage.objects
      for delete to authenticated
      using (bucket_id = 'uploads'
             and (storage.foldername(name))[1] = 'avatars'
             and (storage.foldername(name))[2] = (select auth.uid())::text)
  $p$;
end;
$$;

-- Regla de 0005:153 / 0006:233: toda migracion que crea funciones termina con este revoke.
revoke execute on all functions in schema public from public;
-- Unica excepcion de este archivo, y solo para sesiones: `anon` no tiene "propio" que leer.
grant execute on function public.my_private_profile() to authenticated;
