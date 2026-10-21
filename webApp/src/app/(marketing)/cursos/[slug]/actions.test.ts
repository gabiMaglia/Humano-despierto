import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock se eleva sobre los imports: lo que usa la factory tiene que existir antes, via vi.hoisted.
const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { saveReviewAction } from "./actions";

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
