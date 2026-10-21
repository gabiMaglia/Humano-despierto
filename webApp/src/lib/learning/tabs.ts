// T-033 · "Mi aprendizaje": cómo se reparten los cursos entre pestañas. Pura y sin I/O para que
// el orden y los cortes se prueben sin base. Completado es derivado (progreso = 100), nunca guardado.

export type LearningTab = "en-curso" | "completados" | "guardados" | "solicitados";

const TABS: readonly LearningTab[] = ["en-curso", "completados", "guardados", "solicitados"];

export function parseLearningTab(raw: string | string[] | undefined): LearningTab {
  return typeof raw === "string" && (TABS as readonly string[]).includes(raw) ? (raw as LearningTab) : "en-curso";
}

export interface LearningCourse {
  courseId: string;
  progressPercent: number;
  lastSeenAt: string | null;
  enrolledAt: string;
  continueLessonId: string | null;
}

export interface SavedCourse {
  courseId: string;
  slug: string;
  title: string;
}

const ms = (iso: string) => new Date(iso).getTime();

/** Con progreso primero (último acceso desc); sin progreso después, por alta desc. */
function byLastAccess<T extends LearningCourse>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    if (a.lastSeenAt && b.lastSeenAt) return ms(b.lastSeenAt) - ms(a.lastSeenAt);
    if (a.lastSeenAt) return -1;
    if (b.lastSeenAt) return 1;
    return ms(b.enrolledAt) - ms(a.enrolledAt);
  });
}

export function buildLearningTabs<C extends LearningCourse>(input: {
  courses: C[];
  saved: SavedCourse[];
  requestCount: number;
}) {
  const sorted = byLastAccess(input.courses);
  const enCurso = sorted.filter((c) => c.progressPercent < 100);
  const completados = sorted.filter((c) => c.progressPercent >= 100);
  // Un curso se muestra en una sola pestaña: con inscripción vive en En curso/Completados y sale
  // de Guardados (la fila de la wishlist puede quedar; solo la pestaña no la muestra).
  const enrolledIds = new Set(input.courses.map((c) => c.courseId));
  const guardados: SavedCourse[] = input.saved.filter((s) => !enrolledIds.has(s.courseId));
  return {
    enCurso,
    completados,
    guardados,
    counts: {
      "en-curso": enCurso.length,
      completados: completados.length,
      guardados: guardados.length,
      solicitados: input.requestCount,
    } satisfies Record<LearningTab, number>,
  };
}
