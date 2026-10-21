-- T-041 · El alta por OAuth (Google) no puede abortar por el nombre que manda el proveedor.
--
-- POR QUÉ. `handle_new_user` corre dentro del INSERT de GoTrue en auth.users. Hasta acá copiaba
-- `raw_user_meta_data ->> 'full_name'` tal cual, y `profiles.full_name` tiene el CHECK de forma de
-- 0008 y el guard exacto de 0025. Con un nombre de Google como "Ana www.perez.com" el CHECK
-- rechaza la fila y con ella la CUENTA ENTERA: la persona ve un server_error y no hay forma de
-- entrar. El guard no se relaja (ADR-009/010): el trigger decide no escribir ese nombre.
--
-- Por qué '' y no "probar con name": Google llena `full_name` y `name` con el mismo valor
-- (GoTrue provider/google.go). Si uno es localizador, el otro también.
--
-- `name` como respaldo: un proveedor puede mandar solo `name`. Hoy Google manda los dos, pero
-- confiar en un dato que un tercero manda "a veces" es el bug que este archivo evita.
--
-- 120: el mismo tope que `fullNameSchema` (src/lib/validation/profile.ts) aplica al registro por
-- mail. Sin él, el perfil de Google sería el único camino a un nombre más largo que el formulario.
--
-- El rol sigue siendo el literal 'student' (0002, ADR-006): nunca se lee de raw_user_meta_data.
-- `body_has_known_locator` es SECURITY DEFINER y esta función corre como su owner: no hace falta
-- ningún GRANT nuevo.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := left(
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      ''
    ),
    120
  );
begin
  if public.text_has_locator(v_name) or public.body_has_known_locator(v_name) then
    v_name := '';
  end if;

  insert into public.profiles (id, role, full_name)
  values (new.id, 'student', v_name)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Regla de 0005:153 / 0006:233 — toda migración que crea funciones termina con este revoke.
revoke execute on all functions in schema public from public;
