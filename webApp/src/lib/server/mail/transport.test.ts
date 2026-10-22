import { describe, expect, it } from "vitest";
import { HARD_CAP_MS } from "./limits";
import { MailTransportError, SmtpTransport } from "./transport";

// E1 (ADR-014): acotar el tiempo total es invariante de TODA `MailTransport`, no solo de Resend.
describe("SmtpTransport respeta la invariante de MailTransport", () => {
  it("rechaza un timeout que no le gane al tope de send.ts", () => {
    expect(() => new SmtpTransport({ host: "127.0.0.1", port: 54325, timeoutMs: HARD_CAP_MS })).toThrow();
    expect(() => new SmtpTransport({ host: "127.0.0.1", port: 54325, timeoutMs: 0 })).toThrow();
    expect(() => new SmtpTransport({ host: "127.0.0.1", port: 54325 })).not.toThrow();
  });
});

describe("MailTransportError", () => {
  it("lleva si la falla es permanente, el status y el código del proveedor", () => {
    const err = new MailTransportError("x", true, 403, "validation_error");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("MailTransportError");
    expect({ permanent: err.permanent, status: err.status, code: err.code }).toEqual({
      permanent: true,
      status: 403,
      code: "validation_error",
    });
  });
});
