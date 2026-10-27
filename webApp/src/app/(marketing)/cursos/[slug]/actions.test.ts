import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock se eleva sobre los imports: lo que usa la factory tiene que existir antes, via vi.hoisted.
const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const { subject } = vi.hoisted(() => ({ subject: vi.fn() }));
vi.mock("@/lib/server/rate-limit-subject", () => ({ currentRateLimitSubject: subject }));

import { reportReviewAction, requestEnrollmentAction, saveReviewAction } from "./actions";
import { revalidatePath } from "next/cache";
import { queryChain, argsOf, type ChainCall } from "@/test/query-chain";
import { __resetRateLimiterForTests } from "@/lib/server/rate-limit";

// T-050: cada test arranca con el limitador vacío y una usuaria fija (sin el mock, el sujeto real
// abriría un cliente de Supabase que estos tests cuentan).
beforeEach(() => {
  __resetRateLimiterForTests();
  subject.mockResolvedValue({ kind: "user", id: "u-1" });
});

const IDLE = { error: null, success: null };

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("saveReviewAction", () => {
  beforeEach(() => createClient.mockReset());

  it("rechaza un rating fuera de 1..5 sin crear el cliente de Supabase", async () => {
    const result = await saveReviewAction("c1", "tarot-iniciatico", IDLE, form({ rating: "9", body: "" }));
    expect(result.error).toBeTruthy();
    expect(result.success).toBeNull();
    expect(createClient).not.toHaveBeenCalled();
  });

  it("rechaza un body con link antes de tocar la base", async () => {
    const result = await saveReviewAction("c1", "tarot-iniciatico", IDLE, form({ rating: "5", body: "mirá https://ejemplo.com" }));
    expect(result.error).toMatch(/no puede contener un link/);
    expect(result.success).toBeNull();
    expect(createClient).not.toHaveBeenCalled();
  });

  it("sin sesión devuelve el error de login y no consulta ninguna tabla", async () => {
    const from = vi.fn();
    createClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
      from,
    });
    const result = await saveReviewAction("c1", "tarot-iniciatico", IDLE, form({ rating: "4", body: "" }));
    expect(result.error).toMatch(/iniciar sesión/);
    expect(result.success).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  function sessionWithInsert(uid: string) {
    const insert = vi.fn(async () => ({ error: null }));
    createClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: uid } } }) },
      from: () => ({ insert }),
    });
    return insert;
  }

  it("c.1 · la sexta en la ventana devuelve rate_limited con mensaje humano y no escribe", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-22T12:05:00Z"), toFake: ["Date"] });
    const insert = sessionWithInsert("u-1");
    for (let i = 0; i < 5; i++) {
      expect((await saveReviewAction("c1", "tarot-iniciatico", IDLE, form({ rating: "5", body: "" }))).error).toBeNull();
    }
    const sixth = await saveReviewAction("c1", "tarot-iniciatico", IDLE, form({ rating: "5", body: "" }));
    expect(sixth).toEqual({
      error: "Demasiados intentos. Esperá 5 minutos y volvé a probar.",
      success: null,
      code: "rate_limited",
      retryAfter: 300,
    });
    expect(insert).toHaveBeenCalledTimes(5);
    vi.useRealTimers();
  });

  it("c.2 · dos usuarias con cinco reseñas cada una no se limitan entre sí", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-22T12:05:00Z"), toFake: ["Date"] });
    for (const uid of ["u-a", "u-b"]) {
      subject.mockResolvedValue({ kind: "user", id: uid });
      sessionWithInsert(uid);
      for (let i = 0; i < 5; i++) {
        expect((await saveReviewAction("c1", "tarot-iniciatico", IDLE, form({ rating: "4", body: "" }))).code).toBeUndefined();
      }
    }
    vi.useRealTimers();
  });
});

describe("requestEnrollmentAction", () => {
  const USER = "d0000000-0000-4000-8000-000000000003";
  const COURSE = "c0000000-0000-4000-8000-000000000009";
  const INICIAL = { error: null, success: null };

  function sessionWith(
    userId: string | null,
    results: { course?: unknown; insert?: unknown; existing?: unknown },
  ) {
    const log: { table: string; calls: ChainCall[] }[] = [];
    const from = vi.fn((table: string) => {
      const { chain, calls } = queryChain((c) =>
        table === "courses"
          ? results.course
          : c.some((x) => x.method === "insert")
            ? results.insert
            : (results.existing ?? { data: null, error: null }),
      );
      log.push({ table, calls });
      return chain;
    });
    createClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null } }) },
      from,
    });
    return { from, log };
  }

  beforeEach(() => {
    createClient.mockReset();
    vi.mocked(revalidatePath).mockClear();
  });

  it("sin sesión no consulta ni inserta", async () => {
    const { from } = sessionWith(null, {});
    const r = await requestEnrollmentAction("herbario-lunar", INICIAL, new FormData());
    expect(r).toEqual({ error: "Necesitás iniciar sesión para pedir un curso.", success: null });
    expect(from).not.toHaveBeenCalled();
  });

  it("un slug sin curso publicado no inserta nada", async () => {
    const { log } = sessionWith(USER, { course: { data: null, error: null } });
    const r = await requestEnrollmentAction("no-existe", INICIAL, new FormData());
    expect(r.error).toBe("Este curso no está abierto a inscripciones.");
    expect(log.map((l) => l.table)).toEqual(["courses"]);
    expect(log[0].calls.map((c) => c.args)).toContainEqual(["status", "published"]);
  });

  it("23505 es 'Ya tenés una solicitud para este curso.' (c.4)", async () => {
    sessionWith(USER, {
      course: { data: { id: COURSE }, error: null },
      insert: { data: null, error: { code: "23505", message: "duplicate key" } },
    });
    const r = await requestEnrollmentAction("herbario-lunar", INICIAL, new FormData());
    expect(r).toEqual({ error: "Ya tenés una solicitud para este curso.", success: null });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("D-37 · un curso archivado no está abierto: no inserta", async () => {
    // RLS sigue dejando leer el archivado a quien lo cursó; el corte es el filtro por status.
    const { log } = sessionWith(USER, { course: { data: null, error: null } });
    const r = await requestEnrollmentAction("curso-archivado", INICIAL, new FormData());
    expect(r).toEqual({ error: "Este curso no está abierto a inscripciones.", success: null });
    expect(log[0].calls.map((c) => c.args)).toContainEqual(["status", "published"]);
    expect(log.some((l) => l.calls.some((c) => c.method === "insert"))).toBe(false);
  });

  it.each([
    ["revoked", "Tu inscripción a este curso fue dada de baja."],
    ["rejected", "Tu solicitud para este curso no fue aprobada."],
    ["active", "Ya estás inscripta en este curso."],
    ["requested", "Ya tenés una solicitud para este curso."],
  ])("D-37 · 23505 sobre una fila %s dice lo que pasó", async (status, message) => {
    const { log } = sessionWith(USER, {
      course: { data: { id: COURSE }, error: null },
      insert: { data: null, error: { code: "23505", message: "duplicate key" } },
      existing: { data: { status }, error: null },
    });
    const r = await requestEnrollmentAction("herbario-lunar", INICIAL, new FormData());
    expect(r).toEqual({ error: message, success: null });
    const lectura = log.find((l) => l.table === "enrollments" && !l.calls.some((c) => c.method === "insert"));
    expect(lectura!.calls.map((c) => c.args)).toEqual(
      expect.arrayContaining([["course_id", COURSE], ["user_id", USER]]),
    );
  });

  it("inserta SOLO user_id de sesión y course_id resuelto en servidor, sin status (c.2)", async () => {
    const { log } = sessionWith(USER, {
      course: { data: { id: COURSE }, error: null },
      insert: { data: null, error: null },
    });
    const form = new FormData();
    form.set("status", "active");
    form.set("course_id", "otro-curso");
    const r = await requestEnrollmentAction("herbario-lunar", INICIAL, form);
    expect(r).toEqual({ error: null, success: "Solicitud enviada. Te avisamos por mail cuando la escuela la revise." });
    const insert = log.find((l) => l.table === "enrollments");
    expect(argsOf(insert!.calls, "insert")).toEqual([{ user_id: USER, course_id: COURSE }]);
    expect(revalidatePath).toHaveBeenCalledWith("/cursos/herbario-lunar");
    expect(revalidatePath).toHaveBeenCalledWith("/panel");
  });
});

describe("reportReviewAction", () => {
  const REVIEW = "47b62602-7ab4-4bc1-83f9-c1998d46bc87";
  beforeEach(() => createClient.mockReset());

  it("motivo vacío o de más de 1000 no crea el cliente", async () => {
    for (const reason of ["   ", "x".repeat(1001)]) {
      const out = await reportReviewAction(REVIEW, "tarot-iniciatico", IDLE, form({ reason }));
      expect(out.error).toBeTruthy();
    }
    expect(createClient).not.toHaveBeenCalled();
  });

  it("un id que no es uuid no llega a la base", async () => {
    const out = await reportReviewAction("1 or 1=1", "tarot-iniciatico", IDLE, form({ reason: "Insultos" }));
    expect(out.error).toBeTruthy();
    expect(createClient).not.toHaveBeenCalled();
  });

  it("sin sesión pide login y no inserta", async () => {
    const from = vi.fn();
    createClient.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: null } }) }, from });
    const out = await reportReviewAction(REVIEW, "tarot-iniciatico", IDLE, form({ reason: "Insultos" }));
    expect(out.error).toMatch(/iniciar sesión/);
    expect(from).not.toHaveBeenCalled();
  });

  it("reporta con el id de la sesión, nunca uno del formulario", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn(() => ({ insert }));
    createClient.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: "u-sesion" } } }) }, from });
    const out = await reportReviewAction(REVIEW, "tarot-iniciatico", IDLE, form({ reason: "  Insultos  ", reporterId: "otra" }));
    expect(from).toHaveBeenCalledWith("course_review_reports");
    expect(insert).toHaveBeenCalledWith({ review_id: REVIEW, reporter_id: "u-sesion", reason: "Insultos" });
    expect(out).toEqual({ error: null, success: "Reporte enviado. Lo revisa el equipo de administración." });
  });

  it("un duplicado se traduce", async () => {
    const insert = vi.fn().mockResolvedValue({ error: { code: "23505", message: "dup" } });
    createClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "u" } } }) },
      from: () => ({ insert }),
    });
    const out = await reportReviewAction(REVIEW, "tarot-iniciatico", IDLE, form({ reason: "Insultos" }));
    expect(out.error).toMatch(/Ya reportaste/);
    expect(out.success).toBeNull();
  });
});
