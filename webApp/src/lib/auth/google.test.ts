import { beforeEach, describe, expect, it, vi } from "vitest";
import { startGoogleSignIn, type OAuthClient } from "./google";
import { AUTH_COPY } from "./messages";

const signInWithOAuth = vi.fn();
const client: OAuthClient = { auth: { signInWithOAuth } };
const ORIGIN = "http://localhost:3000";

describe("startGoogleSignIn", () => {
  beforeEach(() => {
    signInWithOAuth.mockReset();
    signInWithOAuth.mockResolvedValue({ data: { provider: "google", url: "x" }, error: null });
  });

  it("pide provider google y vuelve al callback con el next interno (c.3, c.5)", async () => {
    expect(await startGoogleSignIn(client, ORIGIN, "/cursos/tarot-iniciatico")).toBeNull();
    expect(signInWithOAuth).toHaveBeenCalledTimes(1);
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: "http://localhost:3000/auth/callback?next=%2Fcursos%2Ftarot-iniciatico" },
    });
  });

  it("conserva query y fragmento del next como un solo parámetro", async () => {
    await startGoogleSignIn(client, ORIGIN, "/leccion/abc?tab=notas");
    expect(signInWithOAuth.mock.calls[0][0].options.redirectTo).toBe(
      "http://localhost:3000/auth/callback?next=%2Fleccion%2Fabc%3Ftab%3Dnotas",
    );
  });

  // `null` es lo que /entrar pasa cuando no hay `next` válido. Sin `next` el callback elige el
  // destino por rol (T-040 c.9); mandar `/panel` acá dejaría a admin y docente en el panel de alumna.
  it.each([["https://evil.tld"], ["//evil.tld"], ["/\\evil.tld"], [""], [null]])(
    "next %j vuelve a sanearse y el callback queda sin next (c.3, T-040 c.9)",
    async (raw) => {
      await startGoogleSignIn(client, ORIGIN, raw);
      expect(signInWithOAuth.mock.calls[0][0].options.redirectTo).toBe("http://localhost:3000/auth/callback");
    },
  );

  it("no agrega opciones que cambien el flujo (scopes, queryParams, skipBrowserRedirect)", async () => {
    await startGoogleSignIn(client, ORIGIN, "/panel");
    expect(Object.keys(signInWithOAuth.mock.calls[0][0].options)).toEqual(["redirectTo"]);
  });

  it("un error del SDK da el copy genérico, nunca el mensaje crudo", async () => {
    signInWithOAuth.mockResolvedValue({
      data: { provider: "google", url: null },
      error: { code: "unexpected_failure", message: "pkce storage roto" },
    });
    const out = await startGoogleSignIn(client, ORIGIN, "/panel");
    expect(out).toBe(AUTH_COPY.generic);
    expect(out).not.toMatch(/pkce|storage/i);
  });

  it("si el SDK lanza, también es el copy genérico", async () => {
    signInWithOAuth.mockRejectedValue(new Error("crypto.subtle no disponible"));
    expect(await startGoogleSignIn(client, ORIGIN, "/panel")).toBe(AUTH_COPY.generic);
  });
});
