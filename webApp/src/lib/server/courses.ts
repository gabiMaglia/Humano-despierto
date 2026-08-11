import "server-only";
import { getPublicSupabaseClient } from "@/lib/server/supabase-public";

export interface PublishedCourseSummary {
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
  modules: CourseDetailModule[];
  lessonCount: number;
  totalDurationSeconds: number;
}

interface TeacherRow {
  full_name: string;
  bio: string | null;
}

interface PublishedCourseLessonRow {
  duration_seconds: number;
  is_published: boolean;
}

interface PublishedCourseModuleRow {
  lessons: PublishedCourseLessonRow[] | null;
}

interface PublishedCourseRow {
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
      `slug, title, title_em, subtitle, intro, discipline, level, price_cents, currency, roman_num,
       moon_glyph, featured,
       teacher:profiles!courses_teacher_id_fkey(full_name, bio),
       course_modules(lessons(duration_seconds, is_published))`
    )
    .eq("status", "published")
    .order("published_at", { ascending: true });

  if (error) {
    throw new Error(`No se pudo leer el catálogo de cursos: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as PublishedCourseRow[];
  return rows.map((row) => {
    const teacher = firstTeacher(row.teacher);
    const totalDurationSeconds = (row.course_modules ?? []).reduce((sum, m) => {
      const moduleSeconds = (m.lessons ?? [])
        .filter((l) => l.is_published)
        .reduce((s, l) => s + l.duration_seconds, 0);
      return sum + moduleSeconds;
    }, 0);
    return {
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
    };
  });
}

export async function getCourseBySlug(slug: string): Promise<CourseDetail | null> {
  const supabase = getPublicSupabaseClient();
  const { data, error } = await supabase
    .from("courses")
    .select(
      `id, slug, title, title_em, subtitle, intro, discipline, level, price_cents, currency, includes,
       teacher:profiles!courses_teacher_id_fkey(full_name, bio),
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
    modules,
    lessonCount: allLessons.length,
    totalDurationSeconds: allLessons.reduce((sum, l) => sum + l.durationSeconds, 0),
  };
}
