import { describe, expect, it } from "vitest";
import { MailEnvError, parseMailEnv } from "./mail-env";

const SECRET = "re_secreto_123";
const RESEND_OK = { MAIL_TRANSPORT: "resend", RESEND_API_KEY: SECRET, MAIL_FROM_ADDRESS: "hola@humano.test" };

function thrown(env: Record<string, string | undefined>): MailEnvError {
  try {
    parseMailEnv(env);
  } catch (err) {
    expect(err).toBeInstanceOf(MailEnvError);
    return err as MailEnvError;
  }
  throw new Error("parseMailEnv no lanzó");
}

describe("parseMailEnv (ADR-014)", () => {
  it("sin nada: smtp sin host (falla de envío, no de arranque) y remitente por defecto", () => {
    expect(parseMailEnv({})).toEqual({
      transport: "smtp",
      smtp: null,
      from: { email: "no-responder@humano-despierto.local", name: "Humano Despierto" },
    });
  });

  it("MAIL_TRANSPORT vacío equivale a ausente (línea `MAIL_TRANSPORT=` de un .env)", () => {
    expect(parseMailEnv({ MAIL_TRANSPORT: "" }).transport).toBe("smtp");
  });

  it("smtp con Mailpit", () => {
    const cfg = parseMailEnv({ MAIL_TRANSPORT: "smtp", SMTP_HOST: "127.0.0.1", SMTP_PORT: "54325" });
    expect(cfg).toMatchObject({ transport: "smtp", smtp: { host: "127.0.0.1", port: 54325 } });
  });

  it("resend sin RESEND_API_KEY no arranca, con el mensaje exacto", () => {
    expect(thrown({ MAIL_TRANSPORT: "resend", MAIL_FROM_ADDRESS: "a@b.test" }).message).toBe(
      "MAIL_TRANSPORT=resend requiere RESEND_API_KEY (webApp/.env.local)",
    );
  });

  it("espacios no son una clave", () => {
    expect(thrown({ MAIL_TRANSPORT: "resend", RESEND_API_KEY: "   ", MAIL_FROM_ADDRESS: "a@b.test" }).message).toBe(
      "MAIL_TRANSPORT=resend requiere RESEND_API_KEY (webApp/.env.local)",
    );
  });

  it("resend sin MAIL_FROM_ADDRESS nombra la variable y el dominio verificado", () => {
    const msg = thrown({ MAIL_TRANSPORT: "resend", RESEND_API_KEY: SECRET }).message;
    expect(msg).toContain("MAIL_FROM_ADDRESS");
    expect(msg).toContain("dominio verificado en Resend");
  });

  it("resend con MAIL_FROM_NAME no ASCII no arranca", () => {
    const msg = thrown({ ...RESEND_OK, MAIL_FROM_NAME: "Humano Despierto ☉" }).message;
    expect(msg).toContain("MAIL_FROM_NAME");
    expect(msg).toContain("ASCII");
  });

  it.each(["Resend", "ses"])("MAIL_TRANSPORT=%s no cae a smtp en silencio", (value) => {
    expect(thrown({ MAIL_TRANSPORT: value }).message).toContain("smtp|resend");
  });

  it("producción con SMTP fuera de loopback sin credenciales no arranca", () => {
    const msg = thrown({ NODE_ENV: "production", SMTP_HOST: "smtp.gmail.com", SMTP_PORT: "587" }).message;
    expect(msg).toContain("SMTP_HOST");
    expect(msg).toContain("SMTP_USER");
  });

  describe("smtp con Gmail (T-090)", () => {
    const GMAIL = { NODE_ENV: "production", SMTP_HOST: "smtp.gmail.com", SMTP_USER: "escuela@gmail.com", SMTP_PASS: "abcd efgh ijkl mnop" };

    it("465 con SMTP_SECURE=true arranca y lleva auth y TLS", () => {
      const cfg = parseMailEnv({ ...GMAIL, SMTP_PORT: "465", SMTP_SECURE: "true" });
      expect(cfg).toMatchObject({
        transport: "smtp",
        smtp: { host: "smtp.gmail.com", port: 465, secure: true, requireTLS: false, auth: { user: "escuela@gmail.com", pass: "abcd efgh ijkl mnop" } },
      });
    });

    it("587 con SMTP_REQUIRE_TLS=true arranca (STARTTLS)", () => {
      const cfg = parseMailEnv({ ...GMAIL, SMTP_PORT: "587", SMTP_REQUIRE_TLS: "true" });
      expect(cfg).toMatchObject({ smtp: { port: 587, secure: false, requireTLS: true } });
    });

    it("sin TLS no arranca: nunca credenciales en claro", () => {
      const msg = thrown({ ...GMAIL, SMTP_PORT: "587" }).message;
      expect(msg).toContain("SMTP_SECURE");
      expect(msg).toContain("SMTP_REQUIRE_TLS");
    });

    it("tampoco fuera de producción", () => {
      expect(() => parseMailEnv({ ...GMAIL, NODE_ENV: "development", SMTP_PORT: "587" })).toThrow(MailEnvError);
    });

    it.each([{ SMTP_PASS: "" }, { SMTP_USER: "" }])("USER sin PASS (o al revés) no arranca: %j", (override) => {
      const msg = thrown({ ...GMAIL, SMTP_PORT: "465", SMTP_SECURE: "true", ...override }).message;
      expect(msg).toContain("SMTP_USER");
    });

    it("sin credenciales pero con TLS tampoco: el host real exige AUTH", () => {
      const { SMTP_USER: _u, SMTP_PASS: _p, ...noAuth } = GMAIL;
      expect(() => parseMailEnv({ ...noAuth, SMTP_PORT: "465", SMTP_SECURE: "true" })).toThrow(MailEnvError);
    });

    it("loopback con auth y sin TLS (Mailpit con AUTH) sigue permitido", () => {
      const cfg = parseMailEnv({ SMTP_HOST: "127.0.0.1", SMTP_PORT: "54325", SMTP_USER: "u", SMTP_PASS: "p" });
      expect(cfg).toMatchObject({ smtp: { secure: false, requireTLS: false, auth: { user: "u", pass: "p" } } });
    });

    it("Mailpit sin auth no lleva auth ni TLS", () => {
      const cfg = parseMailEnv({ SMTP_HOST: "127.0.0.1", SMTP_PORT: "54325" });
      expect(cfg).toMatchObject({ smtp: { secure: false, requireTLS: false } });
      expect((cfg as { smtp: object }).smtp).not.toHaveProperty("auth");
    });

    it("el remitente puede ser la propia casilla de Gmail", () => {
      const cfg = parseMailEnv({ ...GMAIL, SMTP_PORT: "465", SMTP_SECURE: "true", MAIL_FROM_ADDRESS: "escuela@gmail.com", MAIL_FROM_NAME: "Humano Despierto" });
      expect(cfg.from).toEqual({ email: "escuela@gmail.com", name: "Humano Despierto" });
    });

    it("ningún error filtra la contraseña", () => {
      for (const env of [{ ...GMAIL, SMTP_PORT: "587" }, { ...GMAIL, SMTP_PORT: "587", SMTP_USER: "" }]) {
        const err = thrown(env);
        expect(String(err) + (err.stack ?? "")).not.toContain("abcd efgh");
      }
    });
  });

  it.each(["127.0.0.1", "localhost", "::1"])("producción con SMTP en %s (next start contra Mailpit) arranca", (host) => {
    const cfg = parseMailEnv({ NODE_ENV: "production", SMTP_HOST: host, SMTP_PORT: "54325" });
    expect(cfg).toMatchObject({ transport: "smtp", smtp: { host, port: 54325 } });
  });

  it("resend válido devuelve la clave y el remitente", () => {
    expect(parseMailEnv({ ...RESEND_OK, MAIL_FROM_NAME: "Escuela, Humano" })).toEqual({
      transport: "resend",
      resend: { apiKey: SECRET },
      from: { email: "hola@humano.test", name: "Escuela, Humano" },
    });
  });

  it("ningún error de config filtra la clave", () => {
    const bad = [
      { MAIL_TRANSPORT: "resend", RESEND_API_KEY: SECRET },
      { ...RESEND_OK, MAIL_FROM_NAME: "Ñandú" },
      { ...RESEND_OK, MAIL_TRANSPORT: "Resend" },
      { NODE_ENV: "production", SMTP_HOST: "smtp.gmail.com", SMTP_PORT: "587", RESEND_API_KEY: SECRET },
    ];
    for (const env of bad) {
      const err = thrown(env);
      expect(String(err)).not.toContain(SECRET);
      expect(JSON.stringify(err)).not.toContain(SECRET);
      expect(err.stack ?? "").not.toContain(SECRET);
    }
  });
});
