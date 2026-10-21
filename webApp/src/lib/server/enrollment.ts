import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface StudentCourseAccess {
  hasAccess: boolean;
  completedLessonIds: Set<string>;
}

const NO_ACCESS: StudentCourseAccess = { hasAccess: false, completedLessonIds: new Set() };

export interface DashboardCourse {
  courseId: string;
  slug: string;
  title: string;
  titleEm: string | null;
  discipline: string;
  level: string;
  romanNum: string | null;
  moonGlyph: string | null;
  teacherName: string;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  /** Lección donde continuar: la última vista, o la primera del curso si nunca entró (c.3). `null` solo si el curso no tiene lecciones publicadas. */
  continueLessonId: string | null;
  lastSeenAt: string | null;
}

export interface StudentRequest {
  courseId: string;
  slug: string;
  title: string;
  status: "requested" | "rejected";
  requestedAt: string | null;
  decidedReason: string | null;
}

export interface StudentDashboard {
  courses: DashboardCourse[];
  /** T-043 · lo que la alumna pidió y todavía no cursa: pendiente o no aprobado (con motivo). */
  requests: StudentRequest[];
}

export type StudentEnrollmentState =
  | { status: "anonymous" }
  | { status: "none" }
  | { status: "requested"; requestedAt: string }
  | { status: "active" }
  | { status: "revoked" }
  | { status: "rejected"; decidedReason: string | null };

interface RequestRow {
  course_id: string;
  status: "requested" | "rejected";
  requested_at: string | null;
  decided_reason: string | null;
  course: { slug: string; title: string } | { slug: string; title: string }[] | null;
}

interface DashboardTeacherRow {
  full_name: string;
}

interface DashboardLessonRow {
  id: string;
  position: number;
  is_published: boolean;
}

interface DashboardModuleRow {
  position: number;
  lessons: DashboardLessonRow[] | null;
}

interface DashboardCourseRow {
  id: string;
  slug: string;
  title: string;
  title_em: string | null;
  discipline: string;
  level: string;
  roman_num: string | null;
  moon_glyph: string | null;
  teacher: DashboardTeacherRow | DashboardTeacherRow[] | null;
  course_modules: DashboardModuleRow[] | null;
}

interface EnrollmentRow {
  course_id: string;
  course: DashboardCourseRow | DashboardCourseRow[] | null;
}

interface ProgressRow {
  course_id: string;
  lesson_id: string;
  completed: boolean;
  last_seen_at: string;
}

function firstOf<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

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

/**
 * T-043 · en qué punto está la alumna logueada respecto de UN curso, para elegir el CTA de la
 * ficha. Cliente de sesión: `enrollments_read` solo devuelve la fila propia. `anonymous` existe
 * aparte de `none` porque sin sesión el botón lleva a `/entrar?next=`, no a la action.
 */
export async function getStudentEnrollmentState(courseId: string): Promise<StudentEnrollmentState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "anonymous" };

  const { data, error } = await supabase
    .from("enrollments")
    .select("status, requested_at, decided_reason")
    .eq("course_id", courseId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new Error(`No se pudo leer la inscripción: ${error.message}`);
  if (!data) return { status: "none" };

  switch (data.status) {
    case "requested":
      return { status: "requested", requestedAt: data.requested_at as string };
    case "active":
      return { status: "active" };
    case "revoked":
      return { status: "revoked" };
    case "rejected":
      return { status: "rejected", decidedReason: data.decided_reason ?? null };
    default:
      throw new Error(`Estado de inscripción desconocido: ${String(data.status)}`);
  }
}

async function getStudentRequests(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<StudentRequest[]> {
  const { data, error } = await supabase
    .from("enrollments")
    .select("course_id, status, requested_at, decided_reason, course:courses(slug, title)")
    .eq("user_id", userId)
    .in("status", ["requested", "rejected"])
    .order("requested_at", { ascending: false });

  if (error) throw new Error(`No se pudieron leer las solicitudes: ${error.message}`);

  return ((data ?? []) as unknown as RequestRow[])
    .map((row) => {
      const course = firstOf(row.course);
      // Un curso archivado deja de ser legible por RLS: la solicitud no tiene a dónde linkear.
      if (!course) return null;
      const request: StudentRequest = {
        courseId: row.course_id,
        slug: course.slug,
        title: course.title,
        status: row.status,
        requestedAt: row.requested_at,
        decidedReason: row.decided_reason,
      };
      return request;
    })
    .filter((r): r is StudentRequest => r !== null);
}

/**
 * `/panel` (T-007): las inscripciones activas del usuario logueado, con el progreso calculado
 * desde `lesson_progress` — nunca declarado (ADR-007: `completed` es derivada). Sin sesión,
 * lista vacía; el layout de `(app)` ya garantiza sesión antes de llegar acá, esto es defensa
 * en profundidad y hace la función usable sin depender de ese guard.
 */
export async function getStudentDashboard(): Promise<StudentDashboard> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { courses: [], requests: [] };

  const requests = await getStudentRequests(supabase, user.id);

  const { data: enrollmentRows, error: enrollmentError } = await supabase
    .from("enrollments")
    .select(
      `course_id,
       course:courses(
         id, slug, title, title_em, discipline, level, roman_num, moon_glyph,
         teacher:profiles!courses_teacher_id_fkey(full_name),
         course_modules(position, lessons(id, position, is_published))
       )`
    )
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("enrolled_at", { ascending: true });

  if (enrollmentError) {
    throw new Error(`No se pudieron leer las inscripciones: ${enrollmentError.message}`);
  }

  const rows = (enrollmentRows ?? []) as unknown as EnrollmentRow[];
  if (rows.length === 0) return { courses: [], requests };

  const courseIds = rows.map((r) => r.course_id);

  const { data: progressRows, error: progressError } = await supabase
    .from("lesson_progress")
    .select("course_id, lesson_id, completed, last_seen_at")
    .eq("user_id", user.id)
    .in("course_id", courseIds);

  if (progressError) {
    throw new Error(`No se pudo leer el progreso: ${progressError.message}`);
  }

  const progressByCourse = new Map<string, ProgressRow[]>();
  for (const p of (progressRows ?? []) as ProgressRow[]) {
    const list = progressByCourse.get(p.course_id) ?? [];
    list.push(p);
    progressByCourse.set(p.course_id, list);
  }

  const courses: DashboardCourse[] = rows
    .map((row) => {
      const course = firstOf(row.course);
      if (!course) return null;
      const teacher = firstOf(course.teacher);

      const publishedLessons = (course.course_modules ?? [])
        .flatMap((m) =>
          (m.lessons ?? [])
            .filter((l) => l.is_published)
            .map((l) => ({ id: l.id, position: l.position, modulePosition: m.position }))
        )
        .sort((a, b) => a.modulePosition - b.modulePosition || a.position - b.position);

      const publishedIds = new Set(publishedLessons.map((l) => l.id));
      const progress = (progressByCourse.get(course.id) ?? []).filter((p) => publishedIds.has(p.lesson_id));

      const completedLessons = progress.filter((p) => p.completed).length;
      const totalLessons = publishedLessons.length;
      const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      const lastProgress = [...progress].sort(
        (a, b) => new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime()
      )[0];

      // "Continuar" lleva a la primera lección PENDIENTE, en orden del currículum.
      // Antes usaba el `last_seen_at` más reciente, que cumple la letra del criterio
      // ("la última lección vista") pero traiciona su propósito: con la data real de
      // la alumna, la última vista estaba completada y el botón la devolvía a una
      // clase que ya había terminado. Si no queda ninguna pendiente —curso completo—
      // se cae a la última vista, que es el repaso natural.
      const completedIds = new Set(progress.filter((p) => p.completed).map((p) => p.lesson_id));
      const primeraPendiente = publishedLessons.find((l) => !completedIds.has(l.id));
      const continueLessonId =
        primeraPendiente?.id ?? lastProgress?.lesson_id ?? publishedLessons[0]?.id ?? null;
      const lastSeenAt = lastProgress?.last_seen_at ?? null;

      const dashboardCourse: DashboardCourse = {
        courseId: course.id,
        slug: course.slug,
        title: course.title,
        titleEm: course.title_em,
        discipline: course.discipline,
        level: course.level,
        romanNum: course.roman_num,
        moonGlyph: course.moon_glyph,
        teacherName: teacher?.full_name ?? "—",
        totalLessons,
        completedLessons,
        progressPercent,
        continueLessonId,
        lastSeenAt,
      };
      return dashboardCourse;
    })
    .filter((c): c is DashboardCourse => c !== null);

  return { courses, requests };
}
