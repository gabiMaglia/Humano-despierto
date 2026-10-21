import { describe, expect, it } from "vitest";
import { buildLessonQa, sortAnswers, sortQuestions, type AnswerRow, type BuildLessonQaInput, type QuestionRow } from "./build";

const T = (day: number) => `2026-10-${String(day).padStart(2, "0")}T10:00:00+00:00`;

const q = (over: Partial<QuestionRow> & { id: string }): QuestionRow => ({
  author_id: "u-alumna",
  title: "Título",
  body: "Cuerpo",
  resolved_at: null,
  created_at: T(1),
  updated_at: T(1),
  deleted_at: null,
  deleted_reason: null,
  moderator: null,
  ...over,
});

const a = (over: Partial<AnswerRow> & { id: string; question_id: string }): AnswerRow => ({
  author_id: "u-docente",
  body: "Respuesta",
  is_instructor_answer: true,
  featured_at: null,
  created_at: T(2),
  updated_at: T(2),
  deleted_at: null,
  deleted_reason: null,
  moderator: null,
  ...over,
});

const base: BuildLessonQaInput = {
  viewerId: "u-alumna",
  canAsk: true,
  canModerate: false,
  questions: [],
  answers: [],
  authors: [
    { id: "u-alumna", full_name: "Alumna", glyph: "☽", role: "student" },
    { id: "u-docente", full_name: "Sol Mayor", glyph: "☉", role: "teacher" },
  ],
  voteCounts: [],
  ownVotes: [],
};

describe("buildLessonQa", () => {
  it("ordena por votos, después por fecha descendente, y las borradas al final", () => {
    const data = buildLessonQa({
      ...base,
      questions: [
        q({ id: "vieja", created_at: T(1) }),
        q({ id: "nueva", created_at: T(2) }),
        q({ id: "votada", created_at: T(1) }),
        q({ id: "borrada", deleted_at: T(3), deleted_reason: "spam" }),
      ],
      voteCounts: [
        { question_id: "votada", votes: 3 },
        { question_id: "borrada", votes: 9 },
      ],
    });
    expect(data.questions.map((x) => x.id)).toEqual(["votada", "nueva", "vieja", "borrada"]);
  });

  it("la destacada va primera dentro de su pregunta aunque sea más nueva", () => {
    const data = buildLessonQa({
      ...base,
      questions: [q({ id: "p" })],
      answers: [
        a({ id: "primera", question_id: "p", created_at: T(2), is_instructor_answer: false, author_id: "u-alumna" }),
        a({ id: "destacada", question_id: "p", created_at: T(5), featured_at: T(6) }),
      ],
    });
    expect(data.questions[0].answers.map((x) => x.id)).toEqual(["destacada", "primera"]);
    expect(data.questions[0].answers[0].isFeatured).toBe(true);
  });

  it("isOwn, hasVoted y canResolve salen de la sesión", () => {
    const data = buildLessonQa({
      ...base,
      questions: [q({ id: "mia" }), q({ id: "ajena", author_id: "u-otra" })],
      ownVotes: ["ajena"],
    });
    const byId = Object.fromEntries(data.questions.map((x) => [x.id, x]));
    expect(byId.mia.isOwn).toBe(true);
    expect(byId.mia.canResolve).toBe(true);
    expect(byId.ajena.isOwn).toBe(false);
    expect(byId.ajena.canResolve).toBe(false);
    expect(byId.ajena.hasVoted).toBe(true);
  });

  it("quien modera puede resolver cualquier pregunta", () => {
    const data = buildLessonQa({ ...base, viewerId: "u-docente", canModerate: true, questions: [q({ id: "ajena" })] });
    expect(data.questions[0].canResolve).toBe(true);
  });

  it("una autora que la RPC no devolvió cae en un placeholder sin romper", () => {
    const data = buildLessonQa({ ...base, questions: [q({ id: "x", author_id: "u-desconocida" })] });
    expect(data.questions[0].author).toEqual({ name: "—", glyph: null, role: "student" });
  });

  it("una borrada dice quién y por qué", () => {
    const data = buildLessonQa({
      ...base,
      questions: [q({ id: "b", deleted_at: T(3), deleted_reason: "fuera de tema", moderator: [{ full_name: "Sol Mayor" }] })],
    });
    expect(data.questions[0]).toMatchObject({ isDeleted: true, deletedReason: "fuera de tema", deletedByName: "Sol Mayor" });
  });

  it("propaga los permisos de la sesión", () => {
    const data = buildLessonQa({ ...base, canAsk: false, canModerate: true });
    expect(data).toMatchObject({ isAuthenticated: true, canAsk: false, canModerate: true, questions: [] });
  });
});

describe("desempates", () => {
  it("sortQuestions y sortAnswers desempatan por id para no depender del orden de llegada", () => {
    const qs = buildLessonQa({ ...base, questions: [q({ id: "b" }), q({ id: "a" })] }).questions;
    expect(sortQuestions(qs).map((x) => x.id)).toEqual(["a", "b"]);
    const as = buildLessonQa({
      ...base,
      questions: [q({ id: "p" })],
      answers: [a({ id: "y", question_id: "p" }), a({ id: "x", question_id: "p" })],
    }).questions[0].answers;
    expect(sortAnswers(as).map((x) => x.id)).toEqual(["x", "y"]);
  });
});
