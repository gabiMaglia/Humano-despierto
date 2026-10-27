import "server-only";
import { getPublicSupabaseClient } from "@/lib/server/supabase-public";
import { aggregateRatings } from "@/lib/reviews/rating";
import { signPublicUploadUrls } from "@/lib/server/uploads";
import { log } from "@/lib/server/log";

export interface PublishedCourseSummary {
  id: string;
  slug: string;
  title: string;
  titleEm: string | null;
  subtitle: string | null;
  desc: string | null;
  discipline: string;
  level: string;
  priceCents: number;
  currency: string;
  romanNum: string | null;
  moonGlyph: string | null;
  featured: boolean;
  teacherName: string;
  // Reemplazo de `courses.duration_weeks` (eliminada, ADR-004/T-001): agregado real de
  // `lessons.duration_seconds` publicadas del curso. Usado por T-019 para el filtro de duración.
  totalDurationSeconds: number;
  publishedAt: string | null;
  /** El path, no la URL: `sitemap.ts` tambien lee el catalogo y no tiene por que firmar nada. */
  coverPath: string | null;
  /** Tiene al menos una lección publicada `is_preview`: lo único que habilita decir «clase gratis» (spec Brote). */
  hasPreview: boolean;
  /** Derivados de `course_reviews` (ocultas ya filtradas por RLS); ausentes sin reseñas. */
  rating?: number;
  reviewCount?: number;
}

export interface CourseDetailLesson {
  id: string;
  position: number;
  title: string;
  durationSeconds: number;
  isPreview: boolean;
}

export interface CourseDetailModule {
  position: number;
  title: string;
  description: string | null;
  lessonCount: number;
  lessons: CourseDetailLesson[];
}

export interface CourseDetail {
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
  includes: string[];
  teacherName: string;
  teacherBio: string | null;
  teacherSlug: string | null;
  learningObjectives: string[];
  prerequisites: string[];
  description: string | null;
  language: string;
  promoVideoId: string | null;
  updatedAt: string;
  /** Derivado, nunca una columna: `student_count` seria mentira en cuanto alguien se da de baja.
   *  Sale de `course_student_count()`, que devuelve el numero y nada mas — `anon` no puede leer
   *  `enrollments` y no debe poder. */
  studentCount: number;
  /** URL firmada de 1 h; null sin portada o si el objeto no se pudo firmar. */
  coverUrl: string | null;
  modules: CourseDetailModule[];
  lessonCount: number;
  totalDurationSeconds: number;
}

interface TeacherRow {
  full_name: string;
  bio: string | null;
  slug: string | null;
}

interface PublishedCourseLessonRow {
  duration_seconds: number;
  is_published: boolean;
  is_preview: boolean;
}

interface PublishedCourseModuleRow {
  lessons: PublishedCourseLessonRow[] | null;
}

interface PublishedCourseRow {
  id: string;
  published_at: string | null;
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
  featured: boolean;
  cover_path: string | null;
  teacher: TeacherRow | TeacherRow[] | null;
  course_modules: PublishedCourseModuleRow[] | null;
}

interface CourseDetailLessonRow {
  id: string;
  position: number;
  title: string;
  duration_seconds: number;
  is_preview: boolean;
  is_published: boolean;
}

interface CourseDetailModuleRow {
  position: number;
  title: string;
  description: string | null;
  lessons: CourseDetailLessonRow[] | null;
}

interface CourseDetailRow {
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
  includes: string[] | null;
  learning_objectives: string[] | null;
  prerequisites: string[] | null;
  description: string | null;
  language: string;
  promo_video_id: string | null;
  updated_at: string;
  cover_path: string | null;
  teacher: TeacherRow | TeacherRow[] | null;
  course_modules: CourseDetailModuleRow[] | null;
}

function firstTeacher(teacher: TeacherRow | TeacherRow[] | null): TeacherRow | null {
  if (!teacher) return null;
  return Array.isArray(teacher) ? (teacher[0] ?? null) : teacher;
}

export async function getPublishedCourses(): Promise<PublishedCourseSummary[]> {
  const supabase = getPublicSupabaseClient();
  const { data, error } = await supabase
    .from("courses")
    .select(
      `id, published_at, slug, title, title_em, subtitle, intro, discipline, level, price_cents,
       currency, roman_num, moon_glyph, featured, cover_path,
       teacher:profiles!courses_teacher_id_fkey(full_name, bio),
       course_modules(lessons(duration_seconds, is_published, is_preview))`
    )
    .eq("status", "published")
    .order("published_at", { ascending: true });

  if (error) {
    throw new Error(`No se pudo leer el catálogo de cursos: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as PublishedCourseRow[];

  // Opcion (b) del spec R-01: agregar en TS. Una consulta para todos los cursos; `anon` ya lee
  // `rating` (RLS filtra `hidden_at`). Umbral para pasar a SQL: ~200 reseñas por curso o 100 cursos.
  // Si falla, el catalogo se sirve igual sin rating: una señal ausente no lo tumba.
  const ratings = new Map<string, { average: number; total: number }>();
  if (rows.length > 0) {
    const { data: rv, error: rvError } = await supabase
      .from("course_reviews")
      .select("course_id, rating")
      .in("course_id", rows.map((r) => r.id));
    if (rvError) log.error("catalog_rating_read_failed", { message: rvError.message });
    else for (const [id, agg] of aggregateRatings(rv ?? [])) ratings.set(id, agg);
  }

  return rows.map((row) => {
    const agg = ratings.get(row.id);
    const teacher = firstTeacher(row.teacher);
    const published = (row.course_modules ?? []).flatMap((m) => (m.lessons ?? []).filter((l) => l.is_published));
    const totalDurationSeconds = published.reduce((s, l) => s + l.duration_seconds, 0);
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      titleEm: row.title_em,
      subtitle: row.subtitle,
      desc: row.intro,
      discipline: row.discipline,
      level: row.level,
      priceCents: row.price_cents,
      currency: row.currency,
      romanNum: row.roman_num,
      moonGlyph: row.moon_glyph,
      featured: row.featured,
      teacherName: teacher?.full_name ?? "—",
      totalDurationSeconds,
      publishedAt: row.published_at,
      coverPath: row.cover_path ?? null,
      hasPreview: published.some((l) => l.is_preview),
      ...(agg ? { rating: agg.average, reviewCount: agg.total } : {}),
    };
  });
}

export async function getCourseBySlug(slug: string): Promise<CourseDetail | null> {
  const supabase = getPublicSupabaseClient();
  const { data, error } = await supabase
    .from("courses")
    .select(
      `id, slug, title, title_em, subtitle, intro, discipline, level, price_cents, currency, includes,
       learning_objectives, prerequisites, description, language, promo_video_id, updated_at,
       cover_path,
       teacher:profiles!courses_teacher_id_fkey(full_name, bio, slug),
       course_modules(position, title, description,
         lessons(id, position, title, duration_seconds, is_preview, is_published))`
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo leer el curso "${slug}": ${error.message}`);
  }
  if (!data) return null;

  const row = data as unknown as CourseDetailRow;
  const teacher = firstTeacher(row.teacher);

  // `lessons_read` (RLS) ya filtra a publicadas para este cliente publico (sin owns_course);
  // el filtro explicito queda como defensa en profundidad, no como el unico corte.
  const modules = (row.course_modules ?? [])
    .map((m) => {
      const lessons = (m.lessons ?? [])
        .filter((l) => l.is_published)
        .map((l) => ({
          id: l.id,
          position: l.position,
          title: l.title,
          durationSeconds: l.duration_seconds,
          isPreview: l.is_preview,
        }))
        .sort((a, b) => a.position - b.position);
      return {
        position: m.position,
        title: m.title,
        description: m.description,
        lessonCount: lessons.length,
        lessons,
      };
    })
    .sort((a, b) => a.position - b.position);

  const allLessons = modules.flatMap((m) => m.lessons);

  // `security definer` que devuelve SOLO el entero: `anon` no puede leer `enrollments` (RLS le
  // da 401) y no debe poder. Si la llamada falla, la ficha se sirve igual con 0 — un conteo
  // ausente no puede tumbar la pagina de venta del curso.
  const { data: countData } = await supabase.rpc("course_student_count", { p_course_id: row.id });
  const studentCount = typeof countData === "number" ? countData : 0;

  // La fila ya paso `.eq("status", "published")`: un borrador nunca llega hasta aca (c.6).
  const coverUrl = row.cover_path
    ? ((await signPublicUploadUrls([row.cover_path])).get(row.cover_path) ?? null)
    : null;

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
    includes: row.includes ?? [],
    teacherName: teacher?.full_name ?? "—",
    teacherBio: teacher?.bio ?? null,
    teacherSlug: teacher?.slug ?? null,
    learningObjectives: row.learning_objectives ?? [],
    prerequisites: row.prerequisites ?? [],
    description: row.description,
    language: row.language,
    promoVideoId: row.promo_video_id,
    updatedAt: row.updated_at,
    studentCount,
    coverUrl,
    modules,
    lessonCount: allLessons.length,
    totalDurationSeconds: allLessons.reduce((sum, l) => sum + l.durationSeconds, 0),
  };
}

/**
 * Firma las portadas de las cards que se van a dibujar (el catalogo pagina de a 9). Se llama aunque
 * ninguna tenga portada: `connection()` vuelve dinamica la pagina y una portada nueva no espera un
 * rebuild. Sin paths, `signUploadUrls` no toca Storage.
 */
export async function signCatalogCovers(courses: { coverPath: string | null }[]): Promise<Map<string, string>> {
  return signPublicUploadUrls(courses.map((c) => c.coverPath));
}
