-- T-047 · Portada de curso (S-A, S-D) y cierre de D-34. Bucket `uploads` de 0028 (T-042),
-- carpeta `covers/<id>/`.
--
-- POR QUE UN CHECK ATADO A `id` Y NO UN GUARD. Un CHECK lee `id` de la misma fila: "la portada de X
-- vive en covers/X/" queda dicho sin trigger nuevo ni caso de alcanzabilidad (ADR-011). Quien
-- escribe la fila lo decide `courses_update_own`; que el path sea de ESE curso, este CHECK. Sin
-- bypass de service_role: es invariante, no permiso.
--
-- `cover_path` lo lee `anon` y lo escribe la duena: es de la clase de ADR-009. El regex cierra el
-- dominio (id del curso, uuid, extension de lista) y por eso basta como mitad de FORMA; se llama
-- `_no_locator` para que `locator-columns.mjs` lo cuente. El nombre de archivo es uuid estricto:
-- lo genera el servidor, y un nombre libre es espacio para esconder texto en una columna publica.

alter table public.courses
  add column cover_path text;

alter table public.courses
  add constraint courses_cover_path_no_locator
    check (cover_path is null or cover_path ~ (
      '^covers/' || id::text ||
      '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'));

-- R-1. Sin INSERT: el path necesita el id, que no existe hasta despues del alta. Los grants viven
-- aca y no en 0003 (una migracion aplicada no se reescribe; precedente 0011/0023/0028).
grant select (cover_path) on public.courses to anon, authenticated;
grant update (cover_path) on public.courses to authenticated;

-- ---------------------------------------------------------------- ADR-010: la mitad EXACTA
-- La clase completa, no las columnas que alguien recordo (misma razon que `avatar_path` en 0028).
drop trigger courses_locator_guard on public.courses;
create trigger courses_locator_guard
  before insert or update on public.courses
  for each row execute function public.guard_locator_exacto(
    'title', 'title_em', 'subtitle', 'intro', 'description', 'slug',
    'discipline', 'level', 'moon_glyph', 'roman_num',
    'includes', 'learning_objectives', 'prerequisites', 'cover_path'
  );

-- ---------------------------------------------------------------- Storage (S-D, D-34)
-- PGlite no trae el schema `storage`: el bloque se saltea y la suite no prueba estas policies. Las
-- verifica el harness HTTP (b1, casos k* y p6).
--
-- D-34. NINGUNA sesion escribe objetos en `uploads`. El bucket solo controla 5 MiB y el MIME que
-- declara quien sube; el tope (2 MB avatar, 3 MB portada) y los magic bytes los impone el servidor.
-- Con una policy de INSERT de cliente, una usuaria subia directo por `/storage/v1` cualquier cosa
-- a su carpeta y despues apuntaba la columna ahi por PostgREST. Ahora sube solo la Server Action,
-- con service_role, despues de validar los bytes y la pertenencia, y el path lo arma ella.
-- Quedan para `authenticated` SELECT (la duena firma lo suyo en su panel) y DELETE (quitar lo
-- propio no abre nada: la columna vacia o apunta a un objeto que ya no existe y cae al degradado).
--
-- El `case` antes del `::uuid` NO es estilo: la policy se evalua tambien sobre filas que no son
-- portadas (avatares, listados), y un nombre como `covers/abc/x.png` haria fallar el cast con 22P02
-- y tumbaria la consulta entera. `case` garantiza que el cast solo corre sobre un uuid.
-- DELETE suma `can_author()` para espejar `courses_update_own` (R-2: lee profiles.role).
-- La lectura publica no pasa por aca: la firma service_role en el servidor, solo para publicados.
do $$
begin
  if to_regclass('storage.objects') is null then
    raise notice 'T-047: sin schema storage (PGlite); policies de uploads no se tocan';
    return;
  end if;

  execute 'drop policy if exists uploads_avatars_insert_own on storage.objects';
  execute 'drop policy if exists uploads_avatars_update_own on storage.objects';

  execute 'drop policy if exists uploads_covers_select_own on storage.objects';
  execute 'drop policy if exists uploads_covers_insert_own on storage.objects';
  execute 'drop policy if exists uploads_covers_update_own on storage.objects';
  execute 'drop policy if exists uploads_covers_delete_own on storage.objects';

  execute $p$
    create policy uploads_covers_select_own on storage.objects
      for select to authenticated
      using (bucket_id = 'uploads'
             and (storage.foldername(name))[1] = 'covers'
             and case when (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                      then public.owns_course(((storage.foldername(name))[2])::uuid)
                      else false end)
  $p$;
  execute $p$
    create policy uploads_covers_delete_own on storage.objects
      for delete to authenticated
      using (bucket_id = 'uploads'
             and (storage.foldername(name))[1] = 'covers'
             and case when (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                      then public.owns_course(((storage.foldername(name))[2])::uuid)
                      else false end
             and public.can_author())
  $p$;
end;
$$;
