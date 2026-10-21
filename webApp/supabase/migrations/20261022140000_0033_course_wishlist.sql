-- T-033 · Guardados (wishlist). Tabla de duena pura: sin texto libre (R-3 no aplica), sin UPDATE,
-- DELETE fisico (no hay nada que moderar ni auditar). RLS alcanza como autoridad: sin guard.
--
-- INSERT exige curso `published`: no se guarda un borrador que la alumna no deberia saber que existe.
-- El chequeo mira `status` de forma explicita y no depende de lo que la RLS de `courses` deje ver.

create table public.course_wishlist (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  course_id  uuid not null references public.courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

alter table public.course_wishlist enable row level security;

-- R-1: whitelist por columna, sin `anon`.
revoke all on public.course_wishlist from public, anon, authenticated;
grant select (user_id, course_id, created_at) on public.course_wishlist to authenticated;
grant insert (user_id, course_id) on public.course_wishlist to authenticated;
grant delete on public.course_wishlist to authenticated;

create policy course_wishlist_read_own on public.course_wishlist
  for select to authenticated using (user_id = (select auth.uid()));

create policy course_wishlist_insert_own on public.course_wishlist
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.courses c where c.id = course_id and c.status = 'published')
  );

create policy course_wishlist_delete_own on public.course_wishlist
  for delete to authenticated using (user_id = (select auth.uid()));
