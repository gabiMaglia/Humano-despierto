-- T-080 · D-16 · `owns_course` lee `profiles.role` (regla 3 de CLAUDE.md, R-2).
--
-- QUE ESTABA ROTO (QA T-028, T-030). `owns_course` solo comparaba `courses.teacher_id` con
-- `auth.uid()`. Una docente degradada a alumna seguia siendo "duena": leia y moderaba el Q&A de
-- su curso, destacaba respuestas, llamaba `course_open_questions`, escribia anuncios, modulos y
-- lecciones. El rol de la tabla se ignoraba por completo en todo lo que pasa por este helper.
--
-- EL FIX: ser duena exige ademas `profiles.role = 'teacher'`, leido de la tabla (no del claim).
-- Es el mismo predicado que 0031 (respuestas de docente) y 0032 (reportes de la guia) ya usan.
--
-- POR QUE 'teacher' Y NO ('teacher','admin') como `can_author`: el admin modera por `is_admin()`,
-- que ya esta en cada policy donde le corresponde; darle ademas "duena" por un `teacher_id` le
-- daria la firma de guia (responder resenas como la guia). Hoy ningun curso tiene admin como
-- `teacher_id` (verificado contra la base local 2026-10-27).
--
-- Checklist ADR-011: la docente vigente sigue pudiendo todo lo suyo (cubierto por toda la suite,
-- que siembra docentes con role='teacher'). service_role no pasa por aca (`auth.uid()` nulo ya
-- daba false).

create or replace function public.owns_course(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.courses c
      join public.profiles p on p.id = c.teacher_id
     where c.id = p_course_id
       and c.teacher_id = auth.uid()
       and p.role = 'teacher'
  );
$$;

revoke execute on all functions in schema public from public;
grant execute on function public.owns_course(uuid) to anon, authenticated, service_role;
