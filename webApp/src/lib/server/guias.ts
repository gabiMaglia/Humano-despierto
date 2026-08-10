import "server-only";
import { getPublicSupabaseClient } from "@/lib/server/supabase-public";

// T-017 · lectura publica de la ficha de docente (`/guias`, `/guias/[slug]`, la seccion
// "Maestra" de la landing). Reemplaza `src/lib/mocks/guia.ts`.
//
// POR QUE NO HAY UN CONTEO DE "ESTUDIANTES" PUBLICO. `enrollments` no tiene NINGUN grant de
// SELECT para `anon` (0003_privileges.sql:105-109, solo `authenticated`, y aun asi acotado por
// RLS a las propias) -- es la misma barrera que protege el padron de alumnado de cualquier
// curso. Contar inscripciones para una vanity metric en una pagina de marketing no amerita abrir
// esa columna (mismo criterio de "el default ya es cerrado" de ADR-002). Por eso la ficha
// publica de docente solo expone lo que YA es publico: cantidad de CURSOS publicados (derivado
// de `courses`, que si es de lectura publica) y `years_practice` (editorial, autoreportado).
// `rating`/`students` no tienen equivalente real: ver la migracion 0011 para el fundamento
// completo de que se descarta y por que.

export interface PublicTeacherCard {
  id: string;
  slug: string;
  fullName: string;
  glyph: string | null;
  headline: string | null;
  location: string | null;
  quote: string | null;
  yearsPractice: number | null;
  discipline: string | null;
  coursesCount: number;
}

export interface PublicTeacherCourse {
  slug: string;
  title: string;
  titleEm: string | null;
  discipline: string;
  level: string;
  moonGlyph: string | null;
}

export interface PublicTeacherProfile extends PublicTeacherCard {
  bio: string | null;
  formations: { year: string; title: string; place: string }[];
  testimonials: { quote: string; who: string; course: string }[];
  courses: PublicTeacherCourse[];
}

interface TeacherRow {
  id: string;
  full_name: string;
  slug: string | null;
  glyph: string | null;
  headline: string | null;
  location: string | null;
  quote: string | null;
  years_practice: number | null;
  bio: string | null;
  formations: { year: string; title: string; place: string }[] | null;
  testimonials: { quote: string; who: string; course: string }[] | null;
}

interface CourseRow {
  slug: string;
  title: string;
  title_em: string | null;
  discipline: string;
  level: string;
  moon_glyph: string | null;
  teacher_id: string;
}

function mostFrequent(values: string[]): string | null {
  if (values.length === 0) return null;
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

async function fetchTeachersAndCourses() {
  const supabase = getPublicSupabaseClient();

  const [{ data: teacherRows, error: teacherError }, { data: courseRows, error: courseError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, full_name, slug, glyph, headline, location, quote, years_practice, bio, formations, testimonials"
        )
        .eq("role", "teacher")
        .not("slug", "is", null),
      supabase
        .from("courses")
        .select("slug, title, title_em, discipline, level, moon_glyph, teacher_id")
        .eq("status", "published"),
    ]);

  if (teacherError) {
    throw new Error(`No se pudo leer las docentes: ${teacherError.message}`);
  }
  if (courseError) {
    throw new Error(`No se pudo leer sus cursos: ${courseError.message}`);
  }

  return {
    teachers: (teacherRows ?? []) as unknown as TeacherRow[],
    courses: (courseRows ?? []) as unknown as CourseRow[],
  };
}

function toCard(row: TeacherRow, courses: CourseRow[]): PublicTeacherCard {
  const own = courses.filter((c) => c.teacher_id === row.id);
  return {
    id: row.id,
    slug: row.slug ?? "",
    fullName: row.full_name,
    glyph: row.glyph,
    headline: row.headline,
    location: row.location,
    quote: row.quote,
    yearsPractice: row.years_practice,
    discipline: mostFrequent(own.map((c) => c.discipline)),
    coursesCount: own.length,
  };
}

/**
 * Docentes con al menos un curso publicado: mostrar una ficha vacia ("sin cursos") es peor
 * que no listarla (mismo criterio que T-014/ADR-004 aplican a cualquier promesa sin respaldo).
 */
export async function getPublicTeachers(): Promise<PublicTeacherCard[]> {
  const { teachers, courses } = await fetchTeachersAndCourses();
  return teachers
    .map((row) => toCard(row, courses))
    .filter((t) => t.coursesCount > 0)
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "es"));
}

export async function getTeacherBySlug(slug: string): Promise<PublicTeacherProfile | null> {
  const { teachers, courses } = await fetchTeachersAndCourses();
  const row = teachers.find((t) => t.slug === slug);
  if (!row) return null;

  const card = toCard(row, courses);
  if (card.coursesCount === 0) return null;

  return {
    ...card,
    bio: row.bio,
    formations: row.formations ?? [],
    testimonials: row.testimonials ?? [],
    courses: courses
      .filter((c) => c.teacher_id === row.id)
      .map((c) => ({
        slug: c.slug,
        title: c.title,
        titleEm: c.title_em,
        discipline: c.discipline,
        level: c.level,
        moonGlyph: c.moon_glyph,
      })),
  };
}

/**
 * "Maestra" de la landing. Sin un flag `featured` en `profiles` (no se justifica una columna
 * nueva para un solo widget) y sin poder contar inscripciones como `anon` (ver cabecera del
 * archivo), se elige a la docente con MAS cursos publicados -- metrica publica, derivada,
 * honesta, no arbitraria. Empate: orden alfabetico de slug (deterministico).
 */
export async function getFeaturedTeacher(): Promise<PublicTeacherCard | null> {
  const teachers = await getPublicTeachers();
  if (teachers.length === 0) return null;
  return [...teachers].sort(
    (a, b) => b.coursesCount - a.coursesCount || a.slug.localeCompare(b.slug)
  )[0];
}
