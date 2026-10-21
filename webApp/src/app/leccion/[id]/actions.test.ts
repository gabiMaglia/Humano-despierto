import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/lib/server/certificates", () => ({ ensureCertificate: vi.fn() }));
vi.mock("@/lib/server/mail/notify", () => ({ notifyCourseCompleted: vi.fn() }));

import { deleteLessonNote, updateLessonNote } from "./actions";

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
