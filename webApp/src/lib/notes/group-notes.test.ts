import { afterEach, describe, expect, it, vi } from "vitest";
import { groupNotes, noteHref, type NoteRow } from "./group-notes";

const COURSES = [
  { id: "c1", slug: "tarot", title: "Tarot" },
  { id: "c2", slug: "reiki", title: "Reiki" },
];

const N = (id: string, at: number, lesson: NoteRow["lesson"]): NoteRow => ({
  id,
  body: `body-${id}`,
  at_seconds: at,
  created_at: "2026-01-01T00:00:00Z",
  lesson,
});

const LESSON = (id: string, course: string, pos: number, mod: { title: string; position: number } | null) => ({
  id,
  title: `L-${id}`,
  position: pos,
  course_id: course,
  module: mod,
});

afterEach(() => vi.restoreAllMocks());

describe("noteHref", () => {
  it("lleva al segundo exacto de la leccion", () => {
    expect(noteHref("abc", 754)).toBe("/leccion/abc?t=754");
  });
});

describe("groupNotes", () => {
  it("agrupa por curso, modulo y leccion en orden de curriculum y por segundo ascendente", () => {
    const m1 = { title: "M1", position: 1 };
    const m2 = { title: "M2", position: 2 };
    const rows = [
      N("n1", 90, LESSON("lb", "c1", 1, m2)),
      N("n2", 30, LESSON("la", "c1", 2, m1)),
      N("n3", 10, LESSON("la", "c1", 2, m1)),
      N("n4", 5, LESSON("lr", "c2", 1, m1)),
    ];
    const groups = groupNotes(rows, COURSES, new Set(["c1", "c2"]));

    expect(groups.map((g) => g.title)).toEqual(["Reiki", "Tarot"]);
    const tarot = groups[1];
    expect(tarot.modules.map((m) => m.title)).toEqual(["M1", "M2"]);
    expect(tarot.modules[0].lessons[0].notes.map((n) => n.id)).toEqual(["n3", "n2"]);
    expect(tarot.modules[0].lessons[0].notes[0].href).toBe("/leccion/la?t=10");
  });

  it("curso revocado: lista las notas sin link y lo marca sin acceso", () => {
    const rows = [N("n1", 12, LESSON("la", "c1", 1, { title: "M1", position: 1 }))];
    const [g] = groupNotes(rows, COURSES, new Set());
    expect(g.hasAccess).toBe(false);
    expect(g.modules[0].lessons[0].notes[0].href).toBeNull();
  });

  it("dato roto (leccion sin modulo, sin leccion o curso desconocido) se omite y avisa por onSkip", () => {
    const skipped = vi.fn();
    const rows = [
      N("n1", 1, LESSON("la", "c1", 1, null)),
      N("n2", 1, null),
      N("n3", 1, LESSON("lz", "zz", 1, { title: "M", position: 1 })),
      N("n4", 1, LESSON("lb", "c1", 1, { title: "M1", position: 1 })),
    ];
    const groups = groupNotes(rows, COURSES, new Set(["c1"]), skipped);
    expect(groups).toHaveLength(1);
    expect(groups[0].modules[0].lessons.map((l) => l.lessonId)).toEqual(["lb"]);
    expect(skipped.mock.calls.map((c) => c[0])).toEqual(["n1", "n2", "n3"]);
  });

  it("sin notas no hay grupos", () => {
    expect(groupNotes([], COURSES, new Set(["c1"]))).toEqual([]);
  });

  it("acepta los embeds como arreglo de un elemento", () => {
    const lesson = { ...LESSON("la", "c1", 1, null), module: [{ title: "M1", position: 1 }] };
    const row = { ...N("n1", 3, null), lesson: [lesson] } as unknown as NoteRow;
    expect(groupNotes([row], COURSES, new Set(["c1"]))[0].modules[0].title).toBe("M1");
  });
});
