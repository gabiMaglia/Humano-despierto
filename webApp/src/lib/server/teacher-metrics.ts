import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { assertOwnsCourse } from "@/lib/server/teacher";
import { getCourseReviews } from "@/lib/server/reviews";
import { buildRoster, summarizeEnrollments, type RosterRow } from "@/lib/teacher/roster";

export interface CourseRoster {
  courseTitle: string;
  summary: {
    active: number;
    requested: number;
    rejected: number;
    completed: number;
    ratingAverage: number;
    ratingTotal: number;
    /** D-38 · preguntas vivas sin resolver y sin respuesta de docente (`course_open_questions`, 0031). */
    openQuestions: number;
  };
  rows: RosterRow[];
}

/**
 * `null` si el curso no existe o no es de la docente (misma respuesta, sin enumerar ajenos).
 * Inscripciones por sesión (`enrollments_read` incluye `owns_course`); progreso, certificados y
 * nombres por service_role recién tras `assertOwnsCourse`, porque sus policies son "solo propias".
 * Columnas recortadas a mano: un `select *` acá filtraría datos de alumnas (T-034 c.5).
 * No se lee `decided_reason`: es del admin hacia la alumna, no de la docente.
 * Preguntas abiertas por la sesión: `course_open_questions` exige `owns_course` en la base.
 */
export async function getCourseRoster(courseId: string, teacherId: string): Promise<CourseRoster | null> {
  try {
    await assertOwnsCourse(courseId, teacherId);
  } catch {
    return null;
  }

  const supabase = await createClient();
  const [courseRes, enrollRes, openRes] = await Promise.all([
    supabase.from("courses").select("title").eq("id", courseId).single(),
    supabase
      .from("enrollments")
      .select("user_id, status, enrolled_at")
      .eq("course_id", courseId)
      .order("enrolled_at", { ascending: false }),
    supabase.rpc("course_open_questions", { p_course_id: courseId }),
  ]);
  if (courseRes.error) throw new Error(`No se pudo leer el curso: ${courseRes.error.message}`);
  if (enrollRes.error) throw new Error(`No se pudieron leer las inscripciones: ${enrollRes.error.message}`);
  if (openRes.error) throw new Error(`No se pudieron contar las preguntas abiertas: ${openRes.error.message}`);

  const all = enrollRes.data ?? [];
  const active = all.filter((e) => e.status === "active");
  const userIds = active.map((e) => e.user_id);

  const service = createServiceRoleClient();
  const [lessonsRes, progressRes, certsRes, namesRes, reviews] = await Promise.all([
    service.from("lessons").select("id, is_published").eq("course_id", courseId),
    userIds.length
      ? service.from("lesson_progress").select("user_id, lesson_id, completed").eq("course_id", courseId).in("user_id", userIds)
      : Promise.resolve({ data: [], error: null }),
    userIds.length
      ? service.from("certificates").select("user_id, code").eq("course_id", courseId).in("user_id", userIds)
      : Promise.resolve({ data: [], error: null }),
    userIds.length
      ? service.from("profiles").select("id, full_name").in("id", userIds)
      : Promise.resolve({ data: [], error: null }),
    getCourseReviews(courseId),
  ]);
  for (const r of [lessonsRes, progressRes, certsRes, namesRes]) {
    if (r.error) throw new Error(`No se pudieron leer las alumnas: ${r.error.message}`);
  }

  const certificates = new Map<string, string>();
  for (const c of certsRes.data ?? []) if (c.user_id) certificates.set(c.user_id, c.code);

  const rows = buildRoster({
    enrollments: active.map((e) => ({ userId: e.user_id, enrolledAt: e.enrolled_at })),
    lessons: (lessonsRes.data ?? []).map((l) => ({ id: l.id, isPublished: l.is_published })),
    progress: (progressRes.data ?? []).map((p) => ({ userId: p.user_id, lessonId: p.lesson_id, completed: p.completed })),
    certificates,
    names: new Map((namesRes.data ?? []).map((p) => [p.id, p.full_name])),
  });

  const counts = summarizeEnrollments(all.map((e) => e.status));
  return {
    courseTitle: courseRes.data.title,
    summary: {
      ...counts,
      completed: rows.filter((r) => r.certificateCode !== null).length,
      ratingAverage: reviews.summary.average,
      ratingTotal: reviews.summary.total,
      openQuestions: (openRes.data ?? []).length,
    },
    rows,
  };
}
