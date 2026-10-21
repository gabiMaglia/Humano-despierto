import { describe, it, expect } from "vitest";
import { buildRoster, summarizeEnrollments } from "./roster";

const lessons = [
  { id: "l1", isPublished: true },
  { id: "l2", isPublished: true },
  { id: "l3", isPublished: false },
];

describe("buildRoster", () => {
  it("la leccion en borrador no entra en el denominador ni cuenta como completada", () => {
    const rows = buildRoster({
      enrollments: [{ userId: "u1", enrolledAt: "2026-01-01" }],
      lessons,
      progress: [
        { userId: "u1", lessonId: "l1", completed: true },
        { userId: "u1", lessonId: "l3", completed: true },
      ],
      certificates: new Map(),
      names: new Map([["u1", "Ana"]]),
    });
    expect(rows[0]).toMatchObject({
      name: "Ana",
      progressPercent: 50,
      completedLessons: 1,
      totalLessons: 2,
      certificateCode: null,
    });
  });

  it("completa: 100 % y codigo de certificado", () => {
    const rows = buildRoster({
      enrollments: [{ userId: "u1", enrolledAt: "2026-01-01" }],
      lessons,
      progress: [
        { userId: "u1", lessonId: "l1", completed: true },
        { userId: "u1", lessonId: "l2", completed: true },
      ],
      certificates: new Map([["u1", "abc"]]),
      names: new Map(),
    });
    expect(rows[0]).toMatchObject({ name: "Alumna", progressPercent: 100, certificateCode: "abc" });
  });

  it("no expone que leccion vio ni cuando", () => {
    const rows = buildRoster({
      enrollments: [{ userId: "u1", enrolledAt: "2026-01-01" }],
      lessons,
      progress: [{ userId: "u1", lessonId: "l1", completed: true }],
      certificates: new Map(),
      names: new Map(),
    });
    expect(Object.keys(rows[0]).sort()).toEqual(
      ["certificateCode", "completedLessons", "enrolledAt", "name", "progressPercent", "totalLessons", "userId"].sort(),
    );
  });
});

describe("summarizeEnrollments", () => {
  it("cuenta activas, pendientes y rechazadas sin motivo", () => {
    expect(summarizeEnrollments(["active", "active", "requested", "rejected", "revoked"])).toEqual({
      active: 2,
      requested: 1,
      rejected: 1,
    });
  });
});
