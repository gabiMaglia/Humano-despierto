import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
  createClient: vi.fn(),
  origin: { value: "http://localhost:3000" as string | null },
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/server/site-url", () => ({ getSiteUrl: () => "https://humano.example" }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(mocks.origin.value ? { origin: mocks.origin.value } : {}),
}));

import { requestPasswordResetAction } from "./actions";
import { RESET_REQUEST_INITIAL_STATE } from "@/lib/auth/action-state";

const submit = (email: string) => {
  const fd = new FormData();
  fd.set("email", email);
  return requestPasswordResetAction(RESET_REQUEST_INITIAL_STATE, fd);
};

describe("requestPasswordResetAction", () => {
  beforeEach(() => {
    mocks.resetPasswordForEmail.mockReset();
    mocks.createClient.mockReset();
    mocks.createClient.mockResolvedValue({ auth: { resetPasswordForEmail: mocks.resetPasswordForEmail } });
    mocks.origin.value = "http://localhost:3000";
  });

  it("un mail mal formado se rechaza sin llamar a GoTrue", async () => {
    const out = await submit("sin-arroba");
    expect(out.status).toBe("invalid");
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("respuesta idéntica exista o no la cuenta, con 429 o si el SDK lanza (c.5)", async () => {
    mocks.resetPasswordForEmail.mockResolvedValueOnce({ data: {}, error: null });
    const existe = await submit("alumna@test.local");
    mocks.resetPasswordForEmail.mockResolvedValueOnce({ data: {}, error: null });
    const noExiste = await submit("nadie@test.local");
    mocks.resetPasswordForEmail.mockResolvedValueOnce({
      data: null,
      error: { code: "over_email_send_rate_limit", status: 429 },
    });
    const limitado = await submit("alumna@test.local");
    mocks.resetPasswordForEmail.mockRejectedValueOnce(new Error("red caída"));
    const roto = await submit("alumna@test.local");

    expect(existe).toEqual({ status: "sent", message: expect.stringMatching(/^Si existe una cuenta/) });
    expect(noExiste).toEqual(existe);
    expect(limitado).toEqual(existe);
    expect(roto).toEqual(existe);
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledTimes(4);
  });

  // D-2 (QA ronda 1): con Host y Origin controlados en un POST directo, el link de la víctima
  // (con su `code`) viajaba al host del atacante. El destino sale solo de SITE_URL.
  it.each([
    ["el mismo origen de la app", "http://localhost:3000"],
    ["un Origin con userinfo", "http://localhost:1@0x01020304"],
    ["un host ajeno", "https://evil.tld"],
    ["ningún Origin", null],
  ])("con %s el link va al callback de SITE_URL con next a nueva clave", async (_caso, origin) => {
    mocks.origin.value = origin;
    mocks.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    await submit("  alumna@test.local ");
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith("alumna@test.local", {
      redirectTo: "https://humano.example/auth/callback?next=%2Fentrar%2Fnueva-clave",
    });
  });
});
