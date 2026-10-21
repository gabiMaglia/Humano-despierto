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

  it("producción con SMTP fuera de loopback no arranca", () => {
    const msg = thrown({ NODE_ENV: "production", SMTP_HOST: "smtp.gmail.com", SMTP_PORT: "587" }).message;
    expect(msg).toContain("SMTP_HOST");
    expect(msg).toContain("ADR-014");
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
