import { normalizeTaxonomyKey, taxonomyLabel } from "@/lib/utils/taxonomy";

export interface HeroStat {
  num: string;
  label: string;
}

export interface LandingCounts {
  courses: number;
  teachers: number;
  students: number;
}

export interface DisciplineCount {
  key: string;
  label: string;
  count: number;
}

// T-019 c.2: un numero en 0 se omite, nunca se muestra ni se inventa.
export function buildHeroStats({ courses, teachers, students }: LandingCounts): HeroStat[] {
  const stats: (HeroStat & { n: number })[] = [
    { n: courses, num: String(courses), label: courses === 1 ? "Curso" : "Cursos" },
    { n: teachers, num: String(teachers), label: teachers === 1 ? "Guía" : "Guías" },
    { n: students, num: String(students), label: students === 1 ? "Inscripta" : "Inscriptas" },
  ];
  return stats.filter((s) => s.n > 0).map(({ num, label }) => ({ num, label }));
}

export function disciplineCounts(disciplines: string[]): DisciplineCount[] {
  const acc = new Map<string, number>();
  for (const d of disciplines) {
    const key = normalizeTaxonomyKey(d);
    if (key) acc.set(key, (acc.get(key) ?? 0) + 1);
  }
  return [...acc]
    .map(([key, count]) => ({ key, label: taxonomyLabel(key), count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

export function joinSpanish(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}
