import { beforeEach, describe, expect, it, vi } from "vitest";
// T-050: sin esto el sujeto real abre un cliente de Supabase y gasta el cupo de "ip:unknown"
// compartido entre tests; acá cada test arranca con el limitador vacío y una usuaria fija.
const { rateLimitSubject } = vi.hoisted(() => ({ rateLimitSubject: vi.fn() }));
vi.mock("@/lib/server/rate-limit-subject", () => ({ currentRateLimitSubject: rateLimitSubject }));

const { createClient, revalidatePath } = vi.hoisted(() => ({ createClient: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/server/certificates", () => ({ ensureCertificate: vi.fn() }));
vi.mock("@/lib/server/mail/notify", () => ({ notifyCourseCompleted: vi.fn() }));

import { ensureCertificate } from "@/lib/server/certificates";
import {
  askQuestion,
  deleteLessonNote,
  moderateQuestion,
  resolveClosingHref,
  saveLessonNote,
  updateLessonNote,
  voteQuestion,
} from "./actions";
import { QA_ACTION_INITIAL_STATE } from "@/lib/lesson-qa/action-state";
import { __resetRateLimiterForTests } from "@/lib/server/rate-limit";

beforeEach(() => {
  __resetRateLimiterForTests();
  rateLimitSubject.mockResolvedValue({ kind: "user", id: "u-test" });
});

describe("resolveClosingHref", () => {
  it("con certificado emitido linkea a /certificado/<code>", async () => {
    vi.mocked(ensureCertificate).mockResolvedValue("COD-1");
    await expect(resolveClosingHref("c-1")).resolves.toBe("/certificado/COD-1");
    expect(ensureCertificate).toHaveBeenCalledWith("c-1");
  });

  it("curso incompleto (null) vuelve al panel", async () => {
    vi.mocked(ensureCertificate).mockResolvedValue(null);
    await expect(resolveClosingHref("c-1")).resolves.toBe("/panel");
  });

  it("si ensureCertificate falla, no rompe el cierre: panel", async () => {
    vi.mocked(ensureCertificate).mockRejectedValue(new Error("db"));
    await expect(resolveClosingHref("c-1")).resolves.toBe("/panel");
  });
});

const USER = { id: "u-1" };

// Registra la cadena que la action arma, para afirmar que filtra por id Y por dueño.
function fakeSession(opts: { user: { id: string } | null; rows: unknown[]; error?: { message: string } | null }) {
  const calls: { op: string; payload?: unknown; eq: [string, unknown][] } = { op: "", eq: [] };
  const builder: Record<string, unknown> = {
    update(payload: unknown) {
      calls.op = "update";
      calls.payload = payload;
      return builder;
    },
    delete() {
      calls.op = "delete";
      return builder;
    },
    eq(col: string, val: unknown) {
      calls.eq.push([col, val]);
      return builder;
    },
    select: () => builder,
    then: (resolve: (v: unknown) => void) => resolve({ data: opts.rows, error: opts.error ?? null }),
  };
  const from = vi.fn(() => builder);
  createClient.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: opts.user } }) }, from });
  return { from, calls };
}

describe("saveLessonNote con tope (T-050)", () => {
  beforeEach(() => createClient.mockReset());

  it("pasado el tope lanza el mensaje humano sin escribir", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-22T12:05:00Z"), toFake: ["Date"] });
    const insert = vi.fn(() => ({
      select: () => ({
        single: async () => ({ data: { id: "n", at_seconds: 1, body: "x", created_at: "" }, error: null }),
      }),
    }));
    createClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: USER } }) },
      from: (t: string) =>
        t === "lessons"
          ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { course_id: "c" }, error: null }) }) }) }
          : { insert },
    });
    for (let i = 0; i < 60; i++) await expect(saveLessonNote("l-1", 1, "x")).resolves.toMatchObject({ id: "n" });
    expect(insert).toHaveBeenCalledTimes(60);
    await expect(saveLessonNote("l-1", 1, "x")).rejects.toThrow("Demasiados intentos. Esperá 5 minutos y volvé a probar.");
    expect(insert).toHaveBeenCalledTimes(60);
    vi.useRealTimers();
  });
});

describe("updateLessonNote", () => {
  beforeEach(() => createClient.mockReset());

  it("una nota vacia no toca la base", async () => {
    await expect(updateLessonNote("n1", "   ")).rejects.toThrow(/vacía/);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("sin sesion rechaza y no consulta ninguna tabla", async () => {
    const { from } = fakeSession({ user: null, rows: [] });
    await expect(updateLessonNote("n1", "hola")).rejects.toThrow(/No autenticado/);
    expect(from).not.toHaveBeenCalled();
  });

  it("actualiza solo body (at_seconds se conserva) filtrando por id y user_id", async () => {
    const { calls } = fakeSession({
      user: USER,
      rows: [{ id: "n1", at_seconds: 42, body: "nuevo", created_at: "2026-10-21T00:00:00Z" }],
    });
    const note = await updateLessonNote("n1", "  nuevo  ");
    expect(calls.op).toBe("update");
    expect(calls.payload).toEqual({ body: "nuevo" });
    expect(calls.eq).toEqual([
      ["id", "n1"],
      ["user_id", "u-1"],
    ]);
    expect(note).toEqual({ id: "n1", atSeconds: 42, body: "nuevo", createdAt: "2026-10-21T00:00:00Z" });
  });

  it("si la RLS filtra la fila (nota ajena, 0 filas) falla en vez de simular exito", async () => {
    fakeSession({ user: USER, rows: [] });
    await expect(updateLessonNote("ajena", "hola")).rejects.toThrow(/No se encontró la nota/);
  });
});

describe("deleteLessonNote", () => {
  beforeEach(() => createClient.mockReset());

  it("sin sesion rechaza", async () => {
    fakeSession({ user: null, rows: [] });
    await expect(deleteLessonNote("n1")).rejects.toThrow(/No autenticado/);
  });

  it("borra filtrando por id y user_id", async () => {
    const { calls } = fakeSession({ user: USER, rows: [{ id: "n1" }] });
    await deleteLessonNote("n1");
    expect(calls.op).toBe("delete");
    expect(calls.eq).toEqual([
      ["id", "n1"],
      ["user_id", "u-1"],
    ]);
  });

  it("0 filas (nota ajena o ya borrada) falla", async () => {
    fakeSession({ user: USER, rows: [] });
    await expect(deleteLessonNote("ajena")).rejects.toThrow(/No se encontró la nota/);
  });
});

// ---------------------------------------------------------------- T-030 · Q&A
const LESSON = "60000000-0000-4000-8000-00000000000a";
const QUESTION = "b1000000-0000-4000-8000-00000000000a";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

// Fake con la forma justa que usa write.mjs: insert().select() resuelve al resultado dado.
function clientWith(user: { id: string } | null, insertResult: { data: unknown; error: unknown } = { data: [], error: null }) {
  const from = vi.fn(() => ({ insert: () => ({ select: async () => insertResult }) }));
  return { auth: { getUser: async () => ({ data: { user } }) }, from };
}

describe("askQuestion", () => {
  beforeEach(() => {
    createClient.mockReset();
    revalidatePath.mockReset();
  });

  it("un lessonId que no es uuid se rechaza sin crear el cliente", async () => {
    const r = await askQuestion("../otra", QA_ACTION_INITIAL_STATE, form({ title: "Una duda", body: "Cuerpo" }));
    expect(r.error).toBeTruthy();
    expect(createClient).not.toHaveBeenCalled();
  });

  it("un título corto se rechaza sin crear el cliente", async () => {
    const r = await askQuestion(LESSON, QA_ACTION_INITIAL_STATE, form({ title: "ab", body: "Cuerpo" }));
    expect(r.error).toMatch(/al menos 3/);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("un link en el cuerpo se rechaza antes de tocar la base", async () => {
    const r = await askQuestion(LESSON, QA_ACTION_INITIAL_STATE, form({ title: "Una duda", body: "mirá https://x.com" }));
    expect(r.error).toMatch(/no puede contener un link/);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("sin sesión pide iniciar sesión y no consulta tablas", async () => {
    const client = clientWith(null);
    createClient.mockResolvedValue(client);
    const r = await askQuestion(LESSON, QA_ACTION_INITIAL_STATE, form({ title: "Una duda", body: "Cuerpo" }));
    expect(r.error).toMatch(/iniciar sesión/);
    expect(client.from).not.toHaveBeenCalled();
  });

  it("el 42501 de RLS vuelve como mensaje de permiso, sin texto técnico y sin revalidar", async () => {
    createClient.mockResolvedValue(
      clientWith({ id: "u1" }, { data: null, error: { code: "42501", message: "new row violates row-level security policy" } }),
    );
    const r = await askQuestion(LESSON, QA_ACTION_INITIAL_STATE, form({ title: "Una duda", body: "Cuerpo" }));
    expect(r.error).toMatch(/permiso/);
    expect(r.error).not.toMatch(/row-level/);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("el camino feliz revalida la lección", async () => {
    createClient.mockResolvedValue(clientWith({ id: "u1" }, { data: [{ id: QUESTION }], error: null }));
    const r = await askQuestion(LESSON, QA_ACTION_INITIAL_STATE, form({ title: "Una duda", body: "Cuerpo" }));
    expect(r).toEqual({ error: null, success: "Pregunta publicada." });
    expect(revalidatePath).toHaveBeenCalledWith(`/leccion/${LESSON}`);
  });
});

describe("moderateQuestion y voteQuestion", () => {
  beforeEach(() => createClient.mockReset());

  it("borrar sin motivo se rechaza sin crear el cliente", async () => {
    const r = await moderateQuestion(LESSON, QUESTION, QA_ACTION_INITIAL_STATE, form({ reason: "   " }));
    expect(r.error).toMatch(/motivo/);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("votar con un id inválido se rechaza sin crear el cliente", async () => {
    const r = await voteQuestion(LESSON, "no-es-uuid", true);
    expect(r.error).toBeTruthy();
    expect(createClient).not.toHaveBeenCalled();
  });
});
