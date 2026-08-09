import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getCurrentUser } from "@/lib/server/auth";
import type { AuthUser } from "@/lib/stores/useAuthStore";

/**
 * Puerta única de lectura/escritura del panel docente (T-005). Mismo patrón que
 * `panel/admin/actions.ts::requireAdmin` (T-008) — se reusa la forma, no se reinventa.
 * La sesión se resuelve en servidor y el rol se lee de `profiles.role` (autoridad,
 * ADR-006), nunca del claim del JWT: un admin que degradó a un docente a mitad de
 * sesión no encuentra la puerta abierta acá hasta que su JWT refresque.
 */
export async function requireTeacher(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    throw new Error("No autorizado: se requiere rol docente.");
  }
  return user;
}

export interface TeacherCourseSummary {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published" | "archived";
  moduleCount: number;
  lessonCount: number;
}

interface TeacherCourseSummaryRow {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published" | "archived";
  course_modules: { id: string; lessons: { id: string }[] | null }[] | null;
}

/**
 * Criterio 1: solo los cursos del docente autenticado. Cliente de SESIÓN — `courses_read`
 * (RLS) ya devuelve las propias filas de `teacher_id = auth.uid()` sin importar el status
 * (draft incluido), así que no hace falta service_role para esto.
 */
export async function listTeacherCourses(teacherId: string): Promise<TeacherCourseSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("id, slug, title, status, course_modules(id, lessons(id))")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`No se pudieron leer tus cursos: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as TeacherCourseSummaryRow[];
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    moduleCount: row.course_modules?.length ?? 0,
    lessonCount: (row.course_modules ?? []).reduce((sum, m) => sum + (m.lessons?.length ?? 0), 0),
  }));
}

export interface TeacherCourseFields {
  id: string;
  slug: string;
  title: string;
  titleEm: string | null;
  subtitle: string | null;
  intro: string | null;
  discipline: string;
  level: string;
  priceCents: number;
  currency: string;
  romanNum: string | null;
  moonGlyph: string | null;
  includes: string[];
  status: "draft" | "published" | "archived";
  teacherId: string;
}

export interface TeacherLessonSummary {
  id: string;
  position: number;
  title: string;
  isPreview: boolean;
  isPublished: boolean;
  durationSeconds: number;
  hasVideo: boolean;
}

export interface TeacherModuleWithLessons {
  id: string;
  position: number;
  title: string;
  description: string | null;
  lessons: TeacherLessonSummary[];
}

export interface TeacherCourseDetail extends TeacherCourseFields {
  modules: TeacherModuleWithLessons[];
}

interface CourseFieldsRow {
  id: string;
  slug: string;
  title: string;
  title_em: string | null;
  subtitle: string | null;
  intro: string | null;
  discipline: string;
  level: string;
  price_cents: number;
  currency: string;
  roman_num: string | null;
  moon_glyph: string | null;
  includes: string[] | null;
  status: "draft" | "published" | "archived";
  teacher_id: string;
}

function mapCourseFields(row: CourseFieldsRow): TeacherCourseFields {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    titleEm: row.title_em,
    subtitle: row.subtitle,
    intro: row.intro,
    discipline: row.discipline,
    level: row.level,
    priceCents: row.price_cents,
    currency: row.currency,
    romanNum: row.roman_num,
    moonGlyph: row.moon_glyph,
    includes: row.includes ?? [],
    status: row.status,
    teacherId: row.teacher_id,
  };
}

/**
 * Curso propio, con todos los campos editables + módulos + lecciones. `null` si no
 * existe o no es del docente que llama — misma respuesta para las dos cosas (criterio 6:
 * un docente no distingue "no existe" de "no es tuyo" en la respuesta).
 */
export async function getTeacherCourseDetail(
  courseId: string,
  teacherId: string
): Promise<TeacherCourseDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select(
      `id, slug, title, title_em, subtitle, intro, discipline, level, price_cents, currency,
       roman_num, moon_glyph, includes, status, teacher_id,
       course_modules(id, position, title, description,
         lessons(id, position, title, is_preview, is_published, duration_seconds))`
    )
    .eq("id", courseId)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo leer el curso: ${error.message}`);
  }
  if (!data || data.teacher_id !== teacherId) return null;

  interface Row extends CourseFieldsRow {
    course_modules:
      | {
          id: string;
          position: number;
          title: string;
          description: string | null;
          lessons:
            | {
                id: string;
                position: number;
                title: string;
                is_preview: boolean;
                is_published: boolean;
                duration_seconds: number;
              }[]
            | null;
        }[]
      | null;
  }

  const row = data as unknown as Row;
  const modules: TeacherModuleWithLessons[] = (row.course_modules ?? [])
    .map((m) => ({
      id: m.id,
      position: m.position,
      title: m.title,
      description: m.description,
      lessons: (m.lessons ?? [])
        .map((l) => ({
          id: l.id,
          position: l.position,
          title: l.title,
          isPreview: l.is_preview,
          isPublished: l.is_published,
          durationSeconds: l.duration_seconds,
          hasVideo: l.duration_seconds > 0,
        }))
        .sort((a, b) => a.position - b.position),
    }))
    .sort((a, b) => a.position - b.position);

  return { ...mapCourseFields(row), modules };
}

/**
 * Confirma titularidad de un curso con el cliente de SESIÓN (misma verificación que hace
 * `courses_read`/`owns_course()` en RLS — repetida acá porque los Server Actions de
 * escritura con `service_role` no pueden confiar en que RLS los proteja: ellos SON el
 * bypass). Se usa antes de cualquier escritura privilegiada (video, publicación, alta de
 * recurso) — nunca al revés.
 */
export async function assertOwnsCourse(courseId: string, teacherId: string): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo verificar la titularidad del curso: ${error.message}`);
  }
  if (!data) {
    throw new Error("No autorizado: ese curso no te pertenece.");
  }
}

export interface TeacherLessonFields {
  id: string;
  courseId: string;
  moduleId: string;
  position: number;
  title: string;
  description: string | null;
  isPreview: boolean;
  isPublished: boolean;
  durationSeconds: number;
}

export interface TeacherLessonChapter {
  id: string;
  position: number;
  startSeconds: number;
  label: string;
}

export interface TeacherLessonResource {
  id: string;
  position: number;
  type: "pdf" | "audio" | "texto" | "link";
  name: string;
  sizeLabel: string | null;
}

export interface TeacherLessonPreview {
  videoId: string;
  durationSeconds: number;
}

export interface TeacherLessonDetail {
  lesson: TeacherLessonFields;
  courseSlug: string;
  courseTitle: string;
  chapters: TeacherLessonChapter[];
  resources: TeacherLessonResource[];
  // T-006 (caveat heredado): una docente dueña pero sin inscripción no ve su propio video
  // por `/leccion/[id]` (ADR-003 solo cubre inscripción activa o `is_preview`). En vez de
  // tocar el reproductor de alumno, este panel sirve su propia vista previa: mismo patrón
  // que `getLessonPlayerData` (verificar acceso con el cliente de SESIÓN primero, recién
  // después pedir el localizador con service_role) pero con "sos la dueña" como el único
  // predicado de acceso, en vez de inscripción/preview.
  preview: TeacherLessonPreview | null;
}

interface LessonFieldsRow {
  id: string;
  course_id: string;
  module_id: string;
  position: number;
  title: string;
  description: string | null;
  is_preview: boolean;
  is_published: boolean;
  duration_seconds: number;
}

/**
 * Lección propia completa para el editor: campos + capítulos + recursos (sin
 * `drive_file_id`/`url` — no están en el grant de SELECT de `authenticated`, ADR-003 regla
 * A, ni falta pedirlos: esta vista no los necesita) + la vista previa del video, resuelta
 * con service_role SOLO tras confirmar titularidad con el cliente de sesión.
 */
export async function getTeacherLessonDetail(
  lessonId: string,
  courseId: string,
  teacherId: string
): Promise<TeacherLessonDetail | null> {
  await assertOwnsCourse(courseId, teacherId);

  const supabase = await createClient();
  const { data: lessonRow, error: lessonError } = await supabase
    .from("lessons")
    .select(
      "id, course_id, module_id, position, title, description, is_preview, is_published, duration_seconds"
    )
    .eq("id", lessonId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (lessonError) {
    throw new Error(`No se pudo leer la lección: ${lessonError.message}`);
  }
  if (!lessonRow) return null;

  const [courseRes, chaptersRes, resourcesRes] = await Promise.all([
    supabase.from("courses").select("slug, title").eq("id", courseId).single(),
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
  ]);

  if (courseRes.error) throw new Error(`No se pudo leer el curso: ${courseRes.error.message}`);
  if (chaptersRes.error) throw new Error(`No se pudieron leer los capítulos: ${chaptersRes.error.message}`);
  if (resourcesRes.error) throw new Error(`No se pudieron leer los recursos: ${resourcesRes.error.message}`);

  const row = lessonRow as LessonFieldsRow;

  let preview: TeacherLessonPreview | null = null;
  if (row.duration_seconds > 0) {
    // Único punto de este archivo que usa service_role — recién acá, con la titularidad ya
    // verificada arriba (assertOwnsCourse) con el cliente de sesión.
    const service = createServiceRoleClient();
    const { data: locator, error: locatorError } = await service
      .from("lessons")
      .select("video_id")
      .eq("id", lessonId)
      .single();
    if (locatorError) {
      throw new Error(`No se pudo resolver el video de la lección: ${locatorError.message}`);
    }
    if (locator?.video_id) {
      preview = { videoId: locator.video_id, durationSeconds: row.duration_seconds };
    }
  }

  return {
    lesson: {
      id: row.id,
      courseId: row.course_id,
      moduleId: row.module_id,
      position: row.position,
      title: row.title,
      description: row.description,
      isPreview: row.is_preview,
      isPublished: row.is_published,
      durationSeconds: row.duration_seconds,
    },
    courseSlug: courseRes.data.slug,
    courseTitle: courseRes.data.title,
    chapters: (chaptersRes.data ?? []).map((c) => ({
      id: c.id,
      position: c.position,
      startSeconds: c.start_seconds,
      label: c.label,
    })),
    resources: (resourcesRes.data ?? []).map((r) => ({
      id: r.id,
      position: r.position,
      type: r.type as TeacherLessonResource["type"],
      name: r.name,
      sizeLabel: r.size_label,
    })),
    preview,
  };
}
