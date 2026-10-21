import { describe, expect, it } from "vitest";
import { AUTH_COPY, authErrorMessage } from "./messages";

describe("authErrorMessage", () => {
  it("sin confirmar pide confirmar el mail (c.4)", () => {
    expect(authErrorMessage({ code: "email_not_confirmed" })).toBe("Confirmá tu mail para entrar.");
  });

  it.each([
    ["invalid_credentials", AUTH_COPY.invalidCredentials],
    ["over_email_send_rate_limit", AUTH_COPY.tooManyAttempts],
    ["over_request_rate_limit", AUTH_COPY.tooManyAttempts],
    ["same_password", AUTH_COPY.samePassword],
    ["weak_password", AUTH_COPY.weakPassword],
  ])("%s tiene copy propio", (code, copy) => {
    expect(authErrorMessage({ code })).toBe(copy);
  });

  it("un código desconocido o ausente da el genérico, nunca el mensaje crudo", () => {
    expect(authErrorMessage({ code: "unexpected_failure" })).toBe(AUTH_COPY.generic);
    expect(authErrorMessage({})).toBe(AUTH_COPY.generic);
  });

  it("sin error no hay mensaje", () => {
    expect(authErrorMessage(null)).toBeNull();
  });
});

describe("AUTH_COPY", () => {
  it("el aviso de reset no afirma que la cuenta exista (c.5)", () => {
    expect(AUTH_COPY.resetSent).toMatch(/^Si existe una cuenta/);
  });

  it("el error de enlace no da detalle técnico (c.7)", () => {
    expect(AUTH_COPY.linkExpired).toMatch(/venció o ya se usó/);
    expect(AUTH_COPY.linkExpired).not.toMatch(/code|pkce|token|verifier/i);
  });
});
