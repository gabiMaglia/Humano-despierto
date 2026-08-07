import "server-only";
import { getPublicSupabaseClient } from "@/lib/server/supabase-public";

export interface PublishedCourseSummary {
  slug: string;
  title: string;
  titleEm: string | null;
  desc: string | null;
  discipline: string;
  level: string;
  priceCents: number;
  currency: string;
  romanNum: string | null;
  moonGlyph: string | null;
  featured: boolean;
  teacherName: string;
}

export interface CourseDetailModule {
  position: number;
  title: string;
  description: string | null;
  lessonCount: number;
}

export interface CourseDetail {
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
}

interface TeacherRow {
  full_name: string;
  bio: string | null;
}

interface PublishedCourseRow {
  slug: string;
  title: string;
  title_em: string | null;
  intro: string | null;
  discipline: string;
  level: string;
  price_cents: number;
  currency: string;
  roman_num: string | null;
  moon_glyph: string | null;
  featured: boolean;
  teacher: TeacherRow | TeacherRow[] | null;
}

interface CourseDetailLessonRow {
  is_published: boolean;
}

interface CourseDetailModuleRow {
  position: number;
  title: string;
  description: string | null;
  lessons: CourseDetailLessonRow[] | null;
}

interface CourseDetailRow {
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
      `slug, title, title_em, intro, discipline, level, price_cents, currency, roman_num,
       moon_glyph, featured,
       teacher:profiles!courses_teacher_id_fkey(full_name, bio)`
    )
    .eq("status", "published")
    .order("published_at", { ascending: true });

  if (error) {
    throw new Error(`No se pudo leer el catálogo de cursos: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as PublishedCourseRow[];
  return rows.map((row) => {
    const teacher = firstTeacher(row.teacher);
    return {
      slug: row.slug,
      title: row.title,
      titleEm: row.title_em,
      desc: row.intro,
      discipline: row.discipline,
      level: row.level,
      priceCents: row.price_cents,
      currency: row.currency,
      romanNum: row.roman_num,
      moonGlyph: row.moon_glyph,
      featured: row.featured,
      teacherName: teacher?.full_name ?? "—",
    };
  });
}

export async function getCourseBySlug(slug: string): Promise<CourseDetail | null> {
  const supabase = getPublicSupabaseClient();
  const { data, error } = await supabase
    .from("courses")
    .select(
      `slug, title, title_em, subtitle, intro, discipline, level, price_cents, currency, includes,
       teacher:profiles!courses_teacher_id_fkey(full_name, bio),
       course_modules(position, title, description, lessons(is_published))`
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

  const modules = (row.course_modules ?? [])
    .map((m) => ({
      position: m.position,
      title: m.title,
      description: m.description,
      lessonCount: (m.lessons ?? []).filter((l) => l.is_published).length,
    }))
    .sort((a, b) => a.position - b.position);

  return {
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
    lessonCount: modules.reduce((sum, m) => sum + m.lessonCount, 0),
  };
}
