import { describe, expect, it } from "vitest";
import { buildLearningTabs, parseLearningTab, type LearningCourse, type SavedCourse } from "./tabs";

const course = (over: Partial<LearningCourse> & { courseId: string }): LearningCourse => ({
  progressPercent: 10,
  lastSeenAt: null,
  enrolledAt: "2026-01-01T00:00:00Z",
  continueLessonId: `les-${over.courseId}`,
  ...over,
});
const saved = (courseId: string): SavedCourse => ({ courseId, slug: courseId, title: courseId });

describe("parseLearningTab", () => {
  it("sin tab o con basura cae en en-curso", () => {
    expect(parseLearningTab(undefined)).toBe("en-curso");
    expect(parseLearningTab("zzz")).toBe("en-curso");
    expect(parseLearningTab(["guardados"])).toBe("en-curso");
  });
  it("acepta las cuatro pestañas", () => {
    for (const t of ["en-curso", "completados", "guardados", "solicitados"]) expect(parseLearningTab(t)).toBe(t);
  });
});

describe("buildLearningTabs", () => {
  it("c.5 · En curso ordena por último acceso desc; sin progreso va después por enrolledAt", () => {
    const tabs = buildLearningTabs({
      courses: [
        course({ courseId: "viejo", lastSeenAt: "2026-02-01T00:00:00Z" }),
        course({ courseId: "sin-a", enrolledAt: "2026-03-01T00:00:00Z" }),
        course({ courseId: "reciente", lastSeenAt: "2026-05-01T00:00:00Z" }),
        course({ courseId: "medio", lastSeenAt: "2026-03-15T00:00:00Z" }),
        course({ courseId: "sin-b", enrolledAt: "2026-04-01T00:00:00Z" }),
      ],
      saved: [],
      requestCount: 0,
    });
    expect(tabs.enCurso.map((c) => c.courseId)).toEqual(["reciente", "medio", "viejo", "sin-b", "sin-a"]);
  });

  it("c.6 · un curso al 100% está solo en Completados", () => {
    const tabs = buildLearningTabs({
      courses: [course({ courseId: "a", progressPercent: 100 }), course({ courseId: "b" })],
      saved: [],
      requestCount: 0,
    });
    expect(tabs.completados.map((c) => c.courseId)).toEqual(["a"]);
    expect(tabs.enCurso.map((c) => c.courseId)).toEqual(["b"]);
  });

  it("c.4 · un guardado con inscripción (en curso o completado) no aparece en Guardados", () => {
    const tabs = buildLearningTabs({
      courses: [course({ courseId: "a" }), course({ courseId: "b", progressPercent: 100 })],
      saved: [saved("a"), saved("b"), saved("z")],
      requestCount: 0,
    });
    expect(tabs.guardados).toEqual([saved("z")]);
    expect(tabs.enCurso.map((c) => c.courseId)).toEqual(["a"]);
    expect(tabs.completados.map((c) => c.courseId)).toEqual(["b"]);
  });

  it("cuenta cada pestaña para el rótulo", () => {
    const tabs = buildLearningTabs({
      courses: [course({ courseId: "a" }), course({ courseId: "b", progressPercent: 100 })],
      saved: [saved("q"), saved("a")],
      requestCount: 3,
    });
    expect(tabs.counts).toEqual({ "en-curso": 1, completados: 1, guardados: 1, solicitados: 3 });
  });
});
