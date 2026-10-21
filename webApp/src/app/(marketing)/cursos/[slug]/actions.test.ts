import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock se eleva sobre los imports: lo que usa la factory tiene que existir antes, via vi.hoisted.
const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { requestEnrollmentAction, saveReviewAction } from "./actions";
import { revalidatePath } from "next/cache";
import { queryChain, argsOf, type ChainCall } from "@/test/query-chain";

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
});

describe("requestEnrollmentAction", () => {
  const USER = "d0000000-0000-4000-8000-000000000003";
  const COURSE = "c0000000-0000-4000-8000-000000000009";
  const INICIAL = { error: null, success: null };

  function sessionWith(
    userId: string | null,
    results: { course?: unknown; insert?: unknown },
  ) {
    const log: { table: string; calls: ChainCall[] }[] = [];
    const from = vi.fn((table: string) => {
      const { chain, calls } = queryChain(() =>
        table === "courses" ? results.course : results.insert,
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
