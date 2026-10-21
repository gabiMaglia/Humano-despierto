// Función pura (sin server-only): agrupa las notas de la alumna para /panel/notas y se prueba en Vitest.

type One<T> = T | T[] | null;

export interface NoteRow {
  id: string;
  body: string;
  at_seconds: number;
  created_at: string;
  lesson: One<{
    id: string;
    title: string;
    position: number;
    course_id: string;
    module: One<{ title: string; position: number }>;
  }>;
}

export interface NoteCourse {
  id: string;
  slug: string;
  title: string;
}

export interface GroupedNote {
  id: string;
  body: string;
  atSeconds: number;
  /** null cuando la inscripción está revocada: la nota es de la alumna, el video no. */
  href: string | null;
}

export interface GroupedLesson {
  lessonId: string;
  title: string;
  position: number;
  notes: GroupedNote[];
}

export interface GroupedModule {
  title: string;
  position: number;
  lessons: GroupedLesson[];
}

export interface NoteCourseGroup {
  courseId: string;
  slug: string;
  title: string;
  hasAccess: boolean;
  modules: GroupedModule[];
}

export function noteHref(lessonId: string, atSeconds: number): string {
  return `/leccion/${lessonId}?t=${atSeconds}`;
}

function first<T>(value: One<T>): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function groupNotes(
  rows: NoteRow[],
  courses: NoteCourse[],
  accessibleCourseIds: Set<string>,
): NoteCourseGroup[] {
  const courseById = new Map(courses.map((c) => [c.id, c]));
  const groups = new Map<string, NoteCourseGroup>();

  for (const row of rows) {
    const lesson = first(row.lesson);
    const mod = lesson ? first(lesson.module) : null;
    const course = lesson ? courseById.get(lesson.course_id) : undefined;
    if (!lesson || !mod || !course) {
      console.error(`[notas] nota ${row.id} omitida: lección, módulo o curso no resueltos`);
      continue;
    }

    const hasAccess = accessibleCourseIds.has(course.id);
    let group = groups.get(course.id);
    if (!group) {
      group = { courseId: course.id, slug: course.slug, title: course.title, hasAccess, modules: [] };
      groups.set(course.id, group);
    }

    let m = group.modules.find((x) => x.position === mod.position);
    if (!m) {
      m = { title: mod.title, position: mod.position, lessons: [] };
      group.modules.push(m);
    }
    let l = m.lessons.find((x) => x.lessonId === lesson.id);
    if (!l) {
      l = { lessonId: lesson.id, title: lesson.title, position: lesson.position, notes: [] };
      m.lessons.push(l);
    }
    l.notes.push({
      id: row.id,
      body: row.body,
      atSeconds: row.at_seconds,
      href: hasAccess ? noteHref(lesson.id, row.at_seconds) : null,
    });
  }

  const result = [...groups.values()].sort((a, b) => a.title.localeCompare(b.title, "es"));
  for (const g of result) {
    g.modules.sort((a, b) => a.position - b.position);
    for (const m of g.modules) {
      m.lessons.sort((a, b) => a.position - b.position);
      for (const l of m.lessons) l.notes.sort((a, b) => a.atSeconds - b.atSeconds);
    }
  }
  return result;
}
