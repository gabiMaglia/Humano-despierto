-- Fixtures de prueba por rol (@test.local, contrasena conocida). SOLO LOCAL.
--
-- Salen de seed.sql (D-22, T-084) para que el contenido y las cuentas con clave publica no vivan
-- en el mismo archivo. Corre despues de seed.sql (usa sus cursos) segun `[db.seed] sql_paths` de
-- config.toml. En la nube NUNCA se corre: `supabase db push` aplica migraciones y no siembra, y
-- este archivo no se pasa a mano. Ver "Nube" en webApp/supabase/README.md.

begin;

-- ---------------------------------------------------------------- fixtures de prueba por rol
-- T-038 c.7 · Antes vivian solo en la base local y un `db reset` los borro (N-01). Contrasena
-- de los tres: test-1234. Mismo patron que las docentes de arriba: el trigger
-- on_auth_user_created siembra profiles como student y el UPDATE corrige el rol. La docente
-- no lleva slug a proposito: sin slug queda fuera del directorio publico /guias.
-- Solo para local (ver el encabezado de este archivo).
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  ('d0000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'admin@test.local',
   crypt('test-1234', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Admin de Prueba"}'::jsonb,
   now(), now(), '', '', '', ''),
  ('d0000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'docente@test.local',
   crypt('test-1234', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Docente de Prueba"}'::jsonb,
   now(), now(), '', '', '', ''),
  ('d0000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'alumna@test.local',
   crypt('test-1234', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Alumna de Prueba"}'::jsonb,
   now(), now(), '', '', '', '')
on conflict (id) do nothing;

update public.profiles set role = 'admin'
where id = 'd0000000-0000-4000-8000-000000000001' and role <> 'admin';

update public.profiles set role = 'teacher'
where id = 'd0000000-0000-4000-8000-000000000002' and role <> 'teacher';

-- La alumna de prueba cursa tarot-iniciatico (tiene lecciones publicadas con video_id) y NO
-- esta en herbario-lunar: T-039 c.7 usa ese curso como ataque R-8.
insert into public.enrollments (user_id, course_id, status, granted_by)
select 'd0000000-0000-4000-8000-000000000003'::uuid, c.id, 'active', null
from public.courses c where c.slug = 'tarot-iniciatico'
on conflict (user_id, course_id) do update set status = excluded.status;

-- T-044 · Fixtures de recursos descargables. Cada uno existe para UN criterio del ticket:
-- el de la leccion preview (c.3: anonima baja), el `link` sin drive_file_id (c.2: 302 a `url`),
-- el de otro curso en leccion NO preview (c.6: un id ajeno bajo leccion propia no abre nada) y
-- la alumna revocada (c.7: la fila de inscripcion existe, solo el status la deja afuera).
-- Los drive_file_id son placeholders: el E2E verifica el `Location`, nunca sigue el redirect.
delete from public.lesson_resources where id in (
  'e0440000-0000-4000-8000-000000000001', 'e0440000-0000-4000-8000-000000000002',
  'e0440000-0000-4000-8000-000000000003');

insert into public.lesson_resources (id, course_id, lesson_id, position, type, name, drive_file_id, url, size_label)
select v.id::uuid, l.course_id, l.id, v.position, v.type, v.name, v.drive_file_id, v.url, v.size_label
from (values
  ('e0440000-0000-4000-8000-000000000001', 'tarot-iniciatico', 3, 1, 1, 'pdf',
   'Plantilla de la tirada de tres cartas', 'SEED_PLACEHOLDER_PREVIEW_1', null::text, '1 pág'),
  ('e0440000-0000-4000-8000-000000000002', 'tarot-iniciatico', 3, 4, 4, 'link',
   'Glosario de arcanos en línea', null::text, 'https://example.org/glosario-arcanos', null::text),
  ('e0440000-0000-4000-8000-000000000003', 'herbario-lunar', 2, 1, 1, 'pdf',
   'Calendario de cosecha lunar', 'SEED_PLACEHOLDER_HERB_1', null::text, '2 págs')
) as v(id, slug, module_position, lesson_position, position, type, name, drive_file_id, url, size_label)
join public.courses c on c.slug = v.slug
join public.course_modules cm on cm.course_id = c.id and cm.position = v.module_position
join public.lessons l on l.module_id = cm.id and l.position = v.lesson_position;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  ('d0000000-0000-4000-8000-000000000441', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'revocada@test.local',
   crypt('test-1234', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Alumna Revocada"}'::jsonb,
   now(), now(), '', '', '', '')
on conflict (id) do nothing;

insert into public.enrollments (user_id, course_id, status, granted_by)
select 'd0000000-0000-4000-8000-000000000441'::uuid, c.id, 'revoked', null
from public.courses c where c.slug = 'tarot-iniciatico'
on conflict (user_id, course_id) do update set status = excluded.status;

commit;
