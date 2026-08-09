import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface StudentCourseAccess {
  hasAccess: boolean;
  completedLessonIds: Set<string>;
}

const NO_ACCESS: StudentCourseAccess = { hasAccess: false, completedLessonIds: new Set() };

/**
 * Inscripcion activa + progreso del usuario logueado sobre UN curso, leidos con el cliente
 * de sesion (RLS: `enrollments_read`/`lesson_progress_read_own` solo devuelven filas propias
 * — ADR-003/02_architecture.md §"Superficie de LECTURA"). Sin sesion ⇒ sin acceso, sin pegarle
 * a la DB de mas. `video_id` no se toca aca: esto solo decide si la leccion se linkea, el
 * player (T-006) es quien sirve el video.
 */
export async function getStudentCourseAccess(courseId: string): Promise<StudentCourseAccess> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NO_ACCESS;

  const { data: enrollment, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("id")
    .eq("course_id", courseId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (enrollmentError) {
    throw new Error(`No se pudo verificar la inscripción: ${enrollmentError.message}`);
  }
  if (!enrollment) return NO_ACCESS;

  const { data: progress, error: progressError } = await supabase
    .from("lesson_progress")
    .select("lesson_id, completed")
    .eq("course_id", courseId)
    .eq("user_id", user.id);

  if (progressError) {
    throw new Error(`No se pudo leer el progreso del curso: ${progressError.message}`);
  }

  const completedLessonIds = new Set(
    (progress ?? []).filter((p) => p.completed).map((p) => p.lesson_id as string)
  );

  return { hasAccess: true, completedLessonIds };
}
