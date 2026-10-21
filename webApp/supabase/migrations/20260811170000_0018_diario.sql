-- T-022 · Diario — las docentes escriben (ADR-008, ADR-009)
--
-- Reemplaza el mock `src/lib/mocks/blog.ts`. `diario_posts` es deliberadamente el gemelo
-- estructural de `courses`: autoría de una docente, nace en borrador, publicar es un acto de
-- servidor. Se reusan sin reinventar: `public.set_updated_at()` (0001), `public.sync_published_at()`
-- (0005, ya es genérica sobre `status`/`published_at` — no toca ninguna columna de `courses` por
-- nombre), `public.can_author()` / `public.is_admin()` (0002), `public.text_has_locator()` (0008,
-- reemplazada en 0016) y `public.body_has_known_locator()` (0016).
--
-- ================================================================ criterio 4 · ADR-009, LA TENSIÓN
--
-- El ticket pide explícitamente pensar esto, no copiarlo. Se verifica el precedente en su
-- PREMISA, no en su conclusión — es la lección cara de este sprint (una regla se justificó una
-- vez con `lesson_notes.body` como precedente y no aplicaba: ahí el único lector es quien
-- escribe; acá el lector es CUALQUIERA sin sesión, `/diario` no lleva `[auth]`).
--
-- ¿`diario_posts.body` es la CLASE que ADR-009 protege — "texto libre que el cliente escribe y
-- se lee sin inscripción"? Sí, y con más fuerza que cualquier miembro barrido hasta ahora: los
-- 21 miembros de la tabla de ADR-009 se leen sin INSCRIPCIÓN pero casi todos exigen sesión
-- (`/circulo`) o son metadata corta de catálogo; `/diario` no tiene `[auth]` en absoluto —lo lee
-- `anon` sin JWT, igual que `courses.intro`. La clase aplica.
--
-- Pero la REGLA concreta de ADR-009 (`text_has_locator`, la heurística de forma — cualquier
-- `://`, `www.`, host con TLD conocido) bloquea TODO link, no solo los de esta plataforma.
-- Puesta en `courses.intro` o `lesson_resources.name` no cuesta nada: ninguna docente necesita
-- linkear afuera desde el nombre de un PDF. Puesta en el CUERPO de una entrada de blog, sí
-- cuesta: citar una fuente, linkear su propio sitio, mencionar una nota de otra autora es
-- exactamente lo que un blog hace. Es la tensión que el ticket señala, y aplicar la heurística
-- de forma sin más sería el mismo patrón goloso que ADR-009 ya describe para `lesson_resources`
-- ("la docente no puede nombrar sus archivos") — acá, "la docente no puede escribir un blog".
--
-- DECISIÓN: `body` NO lleva el CHECK de `text_has_locator` (la heurística de forma). Lleva la
-- OTRA mitad de ADR-009/0016 — `body_has_known_locator()`, coincidencia EXACTA contra
-- `lessons.video_id` / `lesson_resources.drive_file_id` / `.url` reales de esta base — en un
-- guard (ver más abajo: un CHECK no puede llevar subconsulta ni depender de otra tabla, 0016).
-- Es cero falsos positivos por construcción (11+ caracteres alfanuméricos con mayús/minús no
-- aparecen por azar en prosa ni en una URL externa legítima) y cubre la fuga real que ADR-003
-- protege: que el localizador de un video o un Drive DE ESTA PLATAFORMA circule fuera de quien
-- pagó. Un link a `wikipedia.org` o al propio Instagram de la docente pasa limpio.
--
-- `title`, `slug` y `excerpt` SÍ llevan `text_has_locator` (la heurística completa, como
-- `courses.title`/`.subtitle`/`.intro`): son metadata corta de catálogo — el título de una
-- entrada nunca necesita ser un link — y quedan en la misma clase que el resto del barrido.
--
-- LO QUE ESTO NO RESUELVE, dicho a propósito (mismo estándar que la nota de 0016): no impide
-- linkear al video/PDF de OTRA escuela, ni un link roto, ni un link que promocione un producto
-- de la competencia. Eso no es la fuga que ADR-003 describe y no hay CHECK que lo resuelva sin
-- prohibir todo link — que es exactamente la alternativa descartada.
--
-- DÓNDE SE APARTA DEL PRECEDENTE INMEDIATO (`guard_campus_posts`, 0016) — a propósito, con
-- motivo escrito. Ese guard evalúa `body_has_known_locator()` DESPUÉS del bypass de
-- `is_service_context()`, así que un Server Action con `service_role` podría, en teoría, escribir
-- un localizador real sin que el guard lo vea. Para permisos (autoría, estado) el bypass es
-- correcto — service_role SÍ tiene que poder tocar esas columnas. Pero un localizador real en el
-- cuerpo no es un permiso, es un invariante — la misma distinción que 0008 ya usó para decidir
-- CHECK-sin-bypass en vez de trigger-con-bypass para `text_has_locator`, y "un invariante con
-- puerta trasera no es un invariante" no debería depender de qué tabla se mire. Ningún Server
-- Action de este proyecto necesita escribir el `video_id` real de un curso en el cuerpo de un
-- post, así que cerrarlo también para `service_role` acá no cuesta nada. Ver `guard_diario_posts`.

-- ================================================================ la tabla

create table public.diario_posts (
  id           uuid        primary key default gen_random_uuid(),
  teacher_id   uuid        not null references public.profiles (id) on delete restrict,
  slug         text        not null unique,
  title        text        not null,
  excerpt      text,
  body         text        not null,
  status       text        not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint diario_posts_published_at_matches_status
    check ((status = 'published') = (published_at is not null))
);

create index diario_posts_teacher_idx on public.diario_posts (teacher_id);
-- Sirve `/diario` (orden por fecha de publicación, solo filas publicadas).
create index diario_posts_published_idx on public.diario_posts (published_at desc) where status = 'published';

create trigger diario_posts_set_updated_at before update on public.diario_posts
  for each row execute function public.set_updated_at();

-- Reuso de la función genérica de 0005: no referencia ninguna tabla por nombre, solo
-- `new.status`/`new.published_at`. Mismo comportamiento que en `courses`: publicar sin fecha
-- pone `now()`, despublicar limpia la fecha, republicar conserva la fecha original si ya tenía.
create trigger diario_posts_sync_published_at before insert or update on public.diario_posts
  for each row execute function public.sync_published_at();

-- ================================================================ el guard (ADR-008 + ADR-009)
--
-- Combinado en una sola función para los dos triggers de escritura (INSERT y UPDATE), como
-- `guard_campus_posts` (0016) — más simple que separar `_insert`/`_update` como `courses`
-- (0005+0006) cuando las ramas comparten tanto código. Orden de disparo: el nombre
-- `diario_posts_guard` ordena antes que `diario_posts_sync_published_at` alfabéticamente, así
-- que este guard ve el `NEW` crudo del cliente — igual que `courses_guard_insert` necesita ver
-- el `published_at` que el cliente mandó ANTES de que `sync_published_at` lo pise (ver 0006:161).
create or replace function public.guard_diario_posts()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- El invariante de localizador corre SIEMPRE, sin excepción de service_role — ver la nota
  -- larga más arriba sobre por qué esto se aparta a propósito de `guard_campus_posts`.
  if (tg_op = 'INSERT' or new.body is distinct from old.body)
     and public.body_has_known_locator(new.body) then
    raise exception 'diario_posts.body contiene un localizador de contenido pago de la plataforma'
      using errcode = '42501';
  end if;

  if public.is_service_context() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.teacher_id is distinct from auth.uid() then
      raise exception 'diario_posts.teacher_id tiene que ser quien escribe' using errcode = '42501';
    end if;
    if new.status is distinct from 'draft' then
      raise exception 'un post nace en draft: publicar es privilegio de service_role (ADR-008)'
        using errcode = '42501';
    end if;
    if new.published_at is not null then
      raise exception 'diario_posts.published_at lo fija el servidor al publicar' using errcode = '42501';
    end if;
    return new;
  end if;

  -- tg_op = 'UPDATE' de acá en más.
  if new.teacher_id is distinct from old.teacher_id then
    raise exception 'diario_posts.teacher_id no se reasigna desde el cliente' using errcode = '42501';
  end if;
  if new.status is distinct from old.status then
    raise exception 'diario_posts.status solo lo cambia service_role (publicar/despublicar)'
      using errcode = '42501';
  end if;
  if new.published_at is distinct from old.published_at then
    raise exception 'diario_posts.published_at lo fija el servidor' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger diario_posts_guard
  before insert or update on public.diario_posts
  for each row execute function public.guard_diario_posts();

-- ================================================================ RLS (ADR-002/ADR-006)

alter table public.diario_posts enable row level security;

-- Mismo predicado que `courses_read` (0004): publicado para cualquiera, propio para su autora
-- sin importar el status (así ve sus borradores en `/panel/docente`), y todo para el admin.
create policy diario_posts_read on public.diario_posts
  for select to anon, authenticated
  using (status = 'published' or teacher_id = auth.uid() or public.is_admin());

create policy diario_posts_insert_own on public.diario_posts
  for insert to authenticated
  with check (teacher_id = auth.uid() and public.can_author());

create policy diario_posts_update_own on public.diario_posts
  for update to authenticated
  using (teacher_id = auth.uid() and public.can_author())
  with check (teacher_id = auth.uid() and public.can_author());

-- Sin restricción de status a diferencia de `courses_delete_own_draft`: un post no tiene FKs
-- colgando de él (ninguna otra tabla lo referencia), así que borrar uno publicado no deja
-- huérfanos — la asimetría con `courses` es deliberada, no un olvido.
create policy diario_posts_delete_own on public.diario_posts
  for delete to authenticated
  using (teacher_id = auth.uid() and public.can_author());

-- ================================================================ privilegios (0003, whitelist)
--
-- `status`/`published_at` fuera de INSERT y UPDATE — criterio 3 del ticket, mismo patrón que
-- `courses.status/featured/published_at` (0003:40-41). El guard de arriba es la SEGUNDA barrera
-- (defensa en profundidad, ADR-008): aunque alguien agregue el grant por error, el guard sigue
-- rechazando. `body` SÍ está en el whitelist — es contenido, no metadata de servidor; lo que lo
-- protege no es el grant sino el guard (`body_has_known_locator`) de arriba.
grant select (id, teacher_id, slug, title, excerpt, body, status, published_at, created_at, updated_at)
  on public.diario_posts to anon, authenticated;
grant insert (teacher_id, slug, title, excerpt, body) on public.diario_posts to authenticated;
grant update (slug, title, excerpt, body)             on public.diario_posts to authenticated;
grant delete                                          on public.diario_posts to authenticated;

-- ================================================================ CHECK anti-localizador (criterio 4)
--
-- Solo la metadata corta de catálogo — `body` queda deliberadamente afuera, ver la nota larga
-- del encabezado. Mismo predicado y mismo criterio de nombre que `courses_*_no_locator` (0008).
alter table public.diario_posts
  add constraint diario_posts_slug_no_locator    check (not public.text_has_locator(slug)),
  add constraint diario_posts_title_no_locator   check (not public.text_has_locator(title)),
  add constraint diario_posts_excerpt_no_locator check (not public.text_has_locator(excerpt));

-- ================================================================ privilegios de ejecución
--
-- REGLA de 0005:153 — toda migración que crea funciones termina con este revoke (Postgres
-- otorga EXECUTE a PUBLIC en toda función nueva por default del core). Solo se crea UNA función
-- acá (`guard_diario_posts`) y es de trigger — no necesita GRANT explícito: disparar un trigger
-- no chequea EXECUTE sobre su función (0005:156-160), y las funciones que SÍ llama desde adentro
-- (`is_service_context`, `body_has_known_locator`) ya tienen su EXECUTE otorgado a `authenticated`
-- desde 0005 y 0016 respectivamente. `text_has_locator`, invocada por los tres CHECK de arriba,
-- ya tiene su EXECUTE otorgado a `authenticated`/`service_role` desde 0008. Nada nuevo que otorgar.
revoke execute on all functions in schema public from public;
