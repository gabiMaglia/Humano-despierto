-- T-001 · Row Level Security — criterio 4
--
-- Reglas de la casa:
--   · toda policy declara `to <rol>` explicito. Nunca `to public`.
--   · toda policy de UPDATE lleva WITH CHECK ademas de USING. Sin WITH CHECK, la fila se puede
--     mutar hacia un estado que ya no cumple el USING (ej. cambiar de dueño y perderla).
--   · NO se usa FORCE ROW LEVEL SECURITY: los helpers son SECURITY DEFINER y corren como owner;
--     con FORCE quedarian sujetos a sus propias policies y recursarian.
--   · service_role tiene BYPASSRLS: las policies no lo alcanzan. Su control es el Server Action.

alter table public.profiles         enable row level security;
alter table public.courses          enable row level security;
alter table public.course_modules   enable row level security;
alter table public.lessons          enable row level security;
alter table public.lesson_chapters  enable row level security;
alter table public.lesson_resources enable row level security;
alter table public.enrollments      enable row level security;
alter table public.lesson_progress  enable row level security;
alter table public.lesson_notes     enable row level security;

-- ---------------------------------------------------------------- profiles
-- Publicos: docentes y admins (alimentan tarjetas de curso y /maestras/[slug]).
-- Los alumnos solo se ven a si mismos: el padron de alumnado no es dato publico.
create policy profiles_read_public on public.profiles
  for select to anon, authenticated
  using (role in ('teacher', 'admin'));

create policy profiles_read_self on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
-- sin policy de INSERT ni DELETE para el cliente.

-- ---------------------------------------------------------------- courses
create policy courses_read on public.courses
  for select to anon, authenticated
  using (status = 'published' or teacher_id = auth.uid() or public.is_admin());

create policy courses_insert_own on public.courses
  for insert to authenticated
  with check (teacher_id = auth.uid() and public.can_author());

create policy courses_update_own on public.courses
  for update to authenticated
  using (teacher_id = auth.uid() and public.can_author())
  with check (teacher_id = auth.uid() and public.can_author());

create policy courses_delete_own_draft on public.courses
  for delete to authenticated
  using (teacher_id = auth.uid() and public.can_author() and status = 'draft');

-- ---------------------------------------------------------------- contenido del curso
-- Las cuatro tablas cuelgan del mismo predicado gracias a `course_id` denormalizado (ADR-005):
-- una policy de una sola tabla, sin joins de dos saltos.
--
-- El predicado de lectura de catalogo es `can_read_course()` — "este curso es visible" — y
-- NO es control de acceso a contenido pago: da true con auth.uid() nulo para todo publicado.
-- Lo que compuerta contenido pago es `has_course_access()` (inscripcion activa) o
-- `lesson_is_preview()`. Ver la clase definida en ADR-003.

create policy course_modules_read on public.course_modules
  for select to anon, authenticated using (public.can_read_course(course_id));
create policy course_modules_write on public.course_modules
  for all to authenticated
  using (public.owns_course(course_id)) with check (public.owns_course(course_id));

create policy lessons_read on public.lessons
  for select to anon, authenticated
  using (public.can_read_course(course_id) and (is_published or public.owns_course(course_id)));
create policy lessons_write on public.lessons
  for all to authenticated
  using (public.owns_course(course_id)) with check (public.owns_course(course_id));

-- lesson_chapters es la EXCEPCION del bloque: la fila entera es contenido pago. Un capitulo
-- ("12:30 · El Loco invertido") solo se consume dentro del player (T-006 c.4); no alimenta
-- ninguna vista de catalogo — el acordeon de T-004 llega hasta la leccion, no hasta el capitulo.
-- Por eso aca el corte es por FILA con has_course_access(), no por columna: no hay nada que
-- mostrar sin inscripcion. `can_read_course()` no sirve: responde "el curso es visible", que es
-- verdadero para todo curso publicado y para auth.uid() nulo.
--
-- Dos policies en vez de un OR: asi `anon` nunca llega a evaluar has_course_access() (funcion
-- sin EXECUTE para anon; un OR daria 42501 en vez de filtrar, porque Postgres no garantiza
-- cortocircuito). anon solo alcanza la rama de vista previa, que es la unica que le corresponde.
create policy lesson_chapters_read_preview on public.lesson_chapters
  for select to anon, authenticated
  using (public.lesson_is_preview(lesson_id));
create policy lesson_chapters_read_access on public.lesson_chapters
  for select to authenticated
  using (public.has_course_access(course_id) or public.owns_course(course_id) or public.is_admin());
create policy lesson_chapters_write on public.lesson_chapters
  for all to authenticated
  using (public.owns_course(course_id)) with check (public.owns_course(course_id));

create policy lesson_resources_read on public.lesson_resources
  for select to anon, authenticated using (public.can_read_course(course_id));
create policy lesson_resources_write on public.lesson_resources
  for all to authenticated
  using (public.owns_course(course_id)) with check (public.owns_course(course_id));

-- ---------------------------------------------------------------- enrollments
-- Solo SELECT. La ausencia de policies de escritura es deliberada y redundante con la
-- ausencia de privilegios en 0003: dos capas para el mismo criterio 5(a).
create policy enrollments_read on public.enrollments
  for select to authenticated
  using (user_id = auth.uid() or public.owns_course(course_id) or public.is_admin());

-- ---------------------------------------------------------------- lesson_progress
create policy lesson_progress_read_own on public.lesson_progress
  for select to authenticated using (user_id = auth.uid());

create policy lesson_progress_insert_own on public.lesson_progress
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (public.has_course_access(course_id) or public.lesson_is_preview(lesson_id))
  );

create policy lesson_progress_update_own on public.lesson_progress
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (public.has_course_access(course_id) or public.lesson_is_preview(lesson_id))
  );

-- ---------------------------------------------------------------- lesson_notes
create policy lesson_notes_read_own on public.lesson_notes
  for select to authenticated using (user_id = auth.uid());

create policy lesson_notes_insert_own on public.lesson_notes
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (public.has_course_access(course_id) or public.lesson_is_preview(lesson_id))
  );

create policy lesson_notes_update_own on public.lesson_notes
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy lesson_notes_delete_own on public.lesson_notes
  for delete to authenticated using (user_id = auth.uid());
