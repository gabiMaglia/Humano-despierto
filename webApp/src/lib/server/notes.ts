import "server-only";
import { createClient } from "@/lib/supabase/server";
import { groupNotes, type NoteCourse, type NoteCourseGroup, type NoteRow } from "@/lib/notes/group-notes";

/**
 * Notas de la alumna logueada, agrupadas para `/panel/notas` (T-046). Cliente de sesión: la RLS
 * `lesson_notes_read_own` devuelve solo filas propias. `lesson_notes.course_id` solo es parte de
 * la FK compuesta hacia `lessons`, así que el embed `course:courses` no resuelve (PGRST200): se
 * piden los cursos aparte. El acceso sale de las inscripciones activas.
 */
export async function getStudentNotes(): Promise<NoteCourseGroup[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: noteRows, error: notesError } = await supabase
    .from("lesson_notes")
    .select(
      `id, body, at_seconds, created_at,
       lesson:lessons(id, title, position, course_id, module:course_modules(title, position))`,
    )
    .eq("user_id", user.id);
  if (notesError) throw new Error(`No se pudieron leer las notas: ${notesError.message}`);

  const rows = (noteRows ?? []) as unknown as NoteRow[];
  if (rows.length === 0) return [];

  const courseIds = [
    ...new Set(
      rows.flatMap((r) => {
        const lesson = Array.isArray(r.lesson) ? r.lesson[0] : r.lesson;
        return lesson ? [lesson.course_id] : [];
      }),
    ),
  ];
  if (courseIds.length === 0) return [];

  const [{ data: courses, error: coursesError }, { data: enrollments, error: enrollmentsError }] = await Promise.all([
    supabase.from("courses").select("id, slug, title").in("id", courseIds),
    supabase.from("enrollments").select("course_id").eq("user_id", user.id).eq("status", "active").in("course_id", courseIds),
  ]);
  if (coursesError) throw new Error(`No se pudieron leer los cursos: ${coursesError.message}`);
  if (enrollmentsError) throw new Error(`No se pudieron leer las inscripciones: ${enrollmentsError.message}`);

  const accessible = new Set((enrollments ?? []).map((e) => e.course_id as string));
  return groupNotes(rows, (courses ?? []) as NoteCourse[], accessible);
}
