import { beforeEach, describe, expect, it, vi } from "vitest";
const { rateLimitSubject } = vi.hoisted(() => ({ rateLimitSubject: vi.fn() }));
vi.mock("@/lib/server/rate-limit-subject", () => ({ currentRateLimitSubject: rateLimitSubject }));
const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));

import { deleteTarotReadingAction, saveTarotReadingAction } from "./actions";
import { __resetRateLimiterForTests } from "@/lib/server/rate-limit";

const INITIAL = { error: null, success: null };
const UID = "20000000-0000-4000-8000-00000000000a";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

function client({ user = { id: UID } as { id: string } | null, insertError = null as { code: string } | null, deleted = [{ id: "x" }] as { id: string }[] } = {}) {
  const insert = vi.fn().mockReturnValue({ select: () => ({ single: async () => ({ data: insertError ? null : { id: "r-1" }, error: insertError }) }) });
  const del = vi.fn().mockReturnValue({ eq: () => ({ select: async () => ({ data: deleted, error: null }) }) });
  createClient.mockResolvedValue({ auth: { getUser: async () => ({ data: { user } }) }, from: () => ({ insert, delete: del }) });
  return { insert, del };
}

beforeEach(() => {
  __resetRateLimiterForTests();
  rateLimitSubject.mockResolvedValue({ kind: "user", id: "u-test" });
  createClient.mockReset();
});

describe("saveTarotReadingAction", () => {
  it("rechaza una codificación inválida sin tocar Supabase", async () => {
    client();
    const r = await saveTarotReadingAction(INITIAL, form({ t: "cruz-celta", c: "1.2", inv: "1" }));
    expect(r.error).toMatch(/tirada/i);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("sin sesión devuelve error de sesión", async () => {
    client({ user: null });
    const r = await saveTarotReadingAction(INITIAL, form({ t: "pasado-presente-futuro", c: "0r.45.12", inv: "1" }));
    expect(r.error).toMatch(/sesión/);
  });

  it("inserta con la forma {i, r}, sin user_id, y devuelve el id", async () => {
    const { insert } = client();
    const r = await saveTarotReadingAction(INITIAL, form({ t: "pasado-presente-futuro", c: "0r.45.12", q: "  ¿Vuelve?\n ", inv: "1" }));
    expect(r.error).toBeNull();
    expect(r.id).toBe("r-1");
    expect(insert).toHaveBeenCalledWith({ spread_id: "pasado-presente-futuro", question: "¿Vuelve?", cards: [{ i: 0, r: true }, { i: 45, r: false }, { i: 12, r: false }], reversed_enabled: true });
    expect(JSON.stringify(insert.mock.calls[0])).not.toContain("user_id");
  });

  it("si hay invertidas pero inv=0, rechaza antes de la base", async () => {
    client();
    const r = await saveTarotReadingAction(INITIAL, form({ t: "pasado-presente-futuro", c: "0r.45.12", inv: "0" }));
    expect(r.error).toMatch(/invertid/i);
    expect(createClient).not.toHaveBeenCalled();
  });
});

describe("saveTarotReadingAction (error de base)", () => {
  it("si el insert falla, devuelve el error genérico", async () => {
    client({ insertError: { code: "23514" } });
    const r = await saveTarotReadingAction(INITIAL, form({ t: "pasado-presente-futuro", c: "0r.45.12", inv: "1" }));
    expect(r.error).toBe("No se pudo guardar la tirada.");
    expect(r.id).toBeUndefined();
  });
});

describe("deleteTarotReadingAction", () => {
  it("si no borró ninguna fila, avisa que no la encontró", async () => {
    client({ deleted: [] });
    const r = await deleteTarotReadingAction(INITIAL, form({ id: "11111111-1111-4111-8111-111111111111" }));
    expect(r.error).toBe("No encontramos esa tirada.");
    expect(r.success).toBeNull();
  });

  it("borra por id con el cliente de sesión", async () => {
    const { del } = client();
    const r = await deleteTarotReadingAction(INITIAL, form({ id: "11111111-1111-4111-8111-111111111111" }));
    expect(r.error).toBeNull();
    expect(del).toHaveBeenCalled();
  });

  it("rechaza un id que no es uuid", async () => {
    client();
    const r = await deleteTarotReadingAction(INITIAL, form({ id: "x" }));
    expect(r.error).toBeTruthy();
    expect(createClient).not.toHaveBeenCalled();
  });
});
