import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getStudentCourseAccess } from "@/lib/server/enrollment";
import { getCourseBySlug } from "@/lib/server/courses";

export interface PlayerChapter {
  id: string;
  position: number;
  startSeconds: number;
  label: string;
}

export interface PlayerResource {
  id: string;
  position: number;
  type: string;
  name: string;
  sizeLabel: string | null;
}

export interface PlayerNote {
  id: string;
  atSeconds: number;
  body: string;
  createdAt: string;
}

export type PlayerLessonState = "done" | "current" | "pending" | "preview" | "locked";

export interface PlayerModuleLesson {
  id: string;
  position: number;
  title: string;
  durationSeconds: number;
  state: PlayerLessonState;
}

export interface PlayerModule {
  position: number;
  title: string;
  lessons: PlayerModuleLesson[];
}

export interface LessonPlayerData {
  lessonId: string;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  moduleTitle: string;
  modulePosition: number;
  lessonPosition: number;
  title: string;
  description: string | null;
  durationSeconds: number;
  videoProvider: "youtube";
  videoId: string;
  chapters: PlayerChapter[];
  resources: PlayerResource[];
  notes: PlayerNote[];
  initialSecondsWatched: number;
  completed: boolean;
  modules: PlayerModule[];
  // T-006 (rechazo 1): un anónimo puede llegar acá para una lección `is_preview` (ADR-003) —
  // `lesson_progress`/`lesson_notes` exigen sesión (`saveLessonProgress`/`saveLessonNote`
  // tiran si no hay `user`). El cliente usa esto para no intentar persistir nada sin sesión, en
  // vez de fallar en silencio contra el server action cada `THROTTLE_MS`.
  isAuthenticated: boolean;
}

interface LessonRow {
  id: string;
  course_id: string;
  module_id: string;
  position: number;
  title: string;
  description: string | null;
  duration_seconds: number;
  is_preview: boolean;
  is_published: boolean;
  module: { title: string; position: number } | { title: string; position: number }[] | null;
}

function firstOf<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Datos completos para renderizar `/leccion/[id]`, con el control de acceso de ADR-003 ya
 * resuelto: si el llamador no tiene inscripción activa en el curso ni la lección es
 * `is_preview`, devuelve `null` — el caller responde con `notFound()`, sin distinguir
 * "no existe" de "no tenés acceso" (misma respuesta para las dos, no hay nada que confirmar).
 *
 * `video_id` es la ÚNICA columna que se lee con el cliente de service_role (ADR-003 regla A:
 * columna localizadora, exclusiva de service_role en lectura y escritura) y sólo se pide DESPUÉS
 * de que el acceso ya se verificó con el cliente de sesión — nunca antes, nunca para decidir el
 * acceso.
 */
export async function getLessonPlayerData(lessonId: string): Promise<LessonPlayerData | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // `lessons.course_id` no es FK simple a `courses.id` — sólo existe como parte de la FK
  // COMPUESTA hacia `course_modules` (ADR-005: `course_id` viaja denormalizado para RLS, no para
  // que PostgREST arme un embed directo). Por eso `course:courses(...)` no resuelve
  // (PGRST200, "no matches were found") y el curso se pide aparte; `module:course_modules(...)`
  // sí resuelve porque esa FK compuesta apunta a `course_modules`.
  const { data: lessonRow, error: lessonError } = await supabase
    .from("lessons")
    .select(
      `id, course_id, module_id, position, title, description, duration_seconds, is_preview, is_published,
       module:course_modules(title, position)`
    )
    .eq("id", lessonId)
    .maybeSingle();

  if (lessonError) {
    throw new Error(`No se pudo leer la lección: ${lessonError.message}`);
  }
  if (!lessonRow || !lessonRow.is_published) return null;

  const row = lessonRow as unknown as LessonRow;
  const moduleInfo = firstOf(row.module);
  if (!moduleInfo) return null;

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("slug, title")
    .eq("id", row.course_id)
    .maybeSingle();
  if (courseError) {
    throw new Error(`No se pudo leer el curso de la lección: ${courseError.message}`);
  }
  if (!course) return null;

  const access = await getStudentCourseAccess(row.course_id);
  const hasAccess = row.is_preview || access.hasAccess;
  if (!hasAccess) return null;

  // Único punto de todo el flujo que usa service_role — recién acá, con el acceso ya resuelto
  // por el cliente de sesión de arriba.
  const service = createServiceRoleClient();
  const { data: locator, error: locatorError } = await service
    .from("lessons")
    .select("video_provider, video_id")
    .eq("id", lessonId)
    .single();

  if (locatorError) {
    throw new Error(`No se pudo resolver el video de la lección: ${locatorError.message}`);
  }
  if (!locator?.video_id || locator.video_provider !== "youtube") {
    throw new Error("La lección no tiene un video cargado.");
  }

  const [chaptersRes, resourcesRes, notesRes, progressRes, courseDetail] = await Promise.all([
    supabase
      .from("lesson_chapters")
      .select("id, position, start_seconds, label")
      .eq("lesson_id", lessonId)
      .order("position"),
    supabase
      .from("lesson_resources")
      .select("id, position, type, name, size_label")
      .eq("lesson_id", lessonId)
      .order("position"),
    user
      ? supabase
          .from("lesson_notes")
          .select("id, at_seconds, body, created_at")
          .eq("lesson_id", lessonId)
          .eq("user_id", user.id)
          .order("at_seconds")
      : Promise.resolve({ data: [], error: null }),
    user
      ? supabase
          .from("lesson_progress")
          .select("seconds_watched, completed")
          .eq("lesson_id", lessonId)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    getCourseBySlug(course.slug),
  ]);

  if (chaptersRes.error) {
    throw new Error(`No se pudieron leer los capítulos: ${chaptersRes.error.message}`);
  }
  if (resourcesRes.error) {
    throw new Error(`No se pudieron leer los recursos: ${resourcesRes.error.message}`);
  }
  if (notesRes.error) {
    throw new Error(`No se pudieron leer las notas: ${notesRes.error.message}`);
  }
  if (progressRes.error) {
    throw new Error(`No se pudo leer el progreso: ${progressRes.error.message}`);
  }

  // Mismo modelo de estados que CurriculumAccordion (T-004): sin inscripción, sólo se ve
  // preview/locked — acá además se marca "current" a la lección que se está reproduciendo.
  const modules: PlayerModule[] = (courseDetail?.modules ?? []).map((m) => ({
    position: m.position,
    title: m.title,
    lessons: m.lessons.map((l) => {
      let state: PlayerLessonState;
      if (l.id === lessonId) {
        state = "current";
      } else if (!access.hasAccess) {
        state = l.isPreview ? "preview" : "locked";
      } else {
        state = access.completedLessonIds.has(l.id) ? "done" : "pending";
      }
      return {
        id: l.id,
        position: l.position,
        title: l.title,
        durationSeconds: l.durationSeconds,
        state,
      };
    }),
  }));

  return {
    lessonId: row.id,
    courseId: row.course_id,
    courseSlug: course.slug,
    courseTitle: course.title,
    moduleTitle: moduleInfo.title,
    modulePosition: moduleInfo.position,
    lessonPosition: row.position,
    title: row.title,
    description: row.description,
    durationSeconds: row.duration_seconds,
    videoProvider: "youtube",
    videoId: locator.video_id,
    chapters: (chaptersRes.data ?? []).map((c) => ({
      id: c.id,
      position: c.position,
      startSeconds: c.start_seconds,
      label: c.label,
    })),
    resources: (resourcesRes.data ?? []).map((r) => ({
      id: r.id,
      position: r.position,
      type: r.type,
      name: r.name,
      sizeLabel: r.size_label,
    })),
    notes: (notesRes.data ?? []).map((n) => ({
      id: n.id,
      atSeconds: n.at_seconds,
      body: n.body,
      createdAt: n.created_at,
    })),
    initialSecondsWatched: progressRes.data?.seconds_watched ?? 0,
    completed: progressRes.data?.completed ?? false,
    modules,
    isAuthenticated: Boolean(user),
  };
}
