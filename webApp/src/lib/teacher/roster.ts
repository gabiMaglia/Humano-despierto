import { progressPercent } from "@/lib/utils/progress";

export interface RosterRow {
  userId: string;
  name: string;
  enrolledAt: string;
  completedLessons: number;
  totalLessons: number;
  progressPercent: number;
  certificateCode: string | null;
}

interface BuildInput {
  enrollments: { userId: string; enrolledAt: string }[];
  lessons: { id: string; isPublished: boolean }[];
  progress: { userId: string; lessonId: string; completed: boolean }[];
  certificates: Map<string, string>;
  names: Map<string, string>;
}

/** Sólo el agregado por alumna: qué lección vio y cuándo no sale de acá (T-034 c.5). */
export function buildRoster({ enrollments, lessons, progress, certificates, names }: BuildInput): RosterRow[] {
  const published = new Set(lessons.filter((l) => l.isPublished).map((l) => l.id));
  const done = new Map<string, Set<string>>();
  for (const p of progress) {
    if (!p.completed || !published.has(p.lessonId)) continue;
    const set = done.get(p.userId) ?? new Set<string>();
    set.add(p.lessonId);
    done.set(p.userId, set);
  }
  return enrollments.map((e) => {
    const completedLessons = done.get(e.userId)?.size ?? 0;
    return {
      userId: e.userId,
      name: names.get(e.userId) ?? "Alumna",
      enrolledAt: e.enrolledAt,
      completedLessons,
      totalLessons: published.size,
      progressPercent: progressPercent(completedLessons, published.size),
      certificateCode: certificates.get(e.userId) ?? null,
    };
  });
}

export function summarizeEnrollments(statuses: string[]): { active: number; requested: number; rejected: number } {
  const count = (s: string) => statuses.filter((x) => x === s).length;
  return { active: count("active"), requested: count("requested"), rejected: count("rejected") };
}
