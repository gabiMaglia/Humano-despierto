// Validación pura de la config de mail (ADR-014). Recibe el env por parámetro y no importa nada
// de `server/`: la usa `instrumentation.ts`, que no compila con `react-server` y donde
// `server-only` lanzaría. Los mensajes nunca incluyen valores, solo nombres de variables.

export interface MailFrom {
  email: string;
  name: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  /** TLS implícito desde la conexión (465). */
  secure: boolean;
  /** STARTTLS obligatorio (587): si el servidor no lo ofrece, no se manda nada. */
  requireTLS: boolean;
  auth?: { user: string; pass: string };
}

export type MailConfig =
  | { transport: "smtp"; smtp: SmtpConfig | null; from: MailFrom }
  | { transport: "resend"; resend: { apiKey: string }; from: MailFrom };

export class MailEnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MailEnvError";
  }
}

type Env = Readonly<Record<string, string | undefined>>;

const DEFAULT_FROM: MailFrom = { email: "no-responder@humano-despierto.local", name: "Humano Despierto" };
const LOOPBACK = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const ENV_FILE = "(webApp/.env.local)";

const filled = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const isTrue = (value: string | undefined): boolean => filled(value)?.toLowerCase() === "true";

function parseSmtp(env: Env): SmtpConfig | null {
  const host = filled(env.SMTP_HOST);
  const port = Number(env.SMTP_PORT);
  if (!host || !Number.isInteger(port) || port <= 0) return null;

  const user = filled(env.SMTP_USER);
  // La contraseña no se recorta: un espacio al final es parte del secreto.
  const pass = env.SMTP_PASS ? env.SMTP_PASS : undefined;
  if (Boolean(user) !== Boolean(pass)) {
    throw new MailEnvError(`SMTP_USER y SMTP_PASS van juntas: falta una de las dos ${ENV_FILE}`);
  }
  const secure = isTrue(env.SMTP_SECURE);
  // Con SECURE ya es TLS desde el primer byte; STARTTLS obligatorio sería redundante.
  const requireTLS = !secure && isTrue(env.SMTP_REQUIRE_TLS);
  const loopback = LOOPBACK.has(host.toLowerCase());

  if (!loopback) {
    // Credenciales o mails en claro contra un MTA real: ni en producción ni en desarrollo.
    if (!user || !pass) {
      throw new MailEnvError(
        `SMTP_HOST fuera de loopback exige SMTP_USER y SMTP_PASS (Gmail: contraseña de aplicación); el SMTP sin AUTH es solo para Mailpit local ${ENV_FILE}`,
      );
    }
    if (!secure && !requireTLS) {
      throw new MailEnvError(
        `SMTP_HOST fuera de loopback exige TLS: SMTP_SECURE=true (puerto 465) o SMTP_REQUIRE_TLS=true (587, STARTTLS); nunca credenciales en claro ${ENV_FILE}`,
      );
    }
  }
  return { host, port, secure, requireTLS, ...(user && pass ? { auth: { user, pass } } : {}) };
}

export function parseMailEnv(env: Env): MailConfig {
  // Sin normalizar mayúsculas: un typo en producción no tiene que caer a smtp en silencio.
  const transport = env.MAIL_TRANSPORT || "smtp";
  if (transport !== "smtp" && transport !== "resend") {
    throw new MailEnvError(`MAIL_TRANSPORT inválido: valores válidos smtp|resend ${ENV_FILE}`);
  }

  if (transport === "smtp") {
    return {
      transport,
      smtp: parseSmtp(env),
      from: { email: filled(env.MAIL_FROM_ADDRESS) ?? DEFAULT_FROM.email, name: filled(env.MAIL_FROM_NAME) ?? DEFAULT_FROM.name },
    };
  }

  const apiKey = filled(env.RESEND_API_KEY);
  if (!apiKey) throw new MailEnvError(`MAIL_TRANSPORT=resend requiere RESEND_API_KEY ${ENV_FILE}`);

  const email = filled(env.MAIL_FROM_ADDRESS);
  if (!email) {
    throw new MailEnvError(
      `MAIL_TRANSPORT=resend requiere MAIL_FROM_ADDRESS de un dominio verificado en Resend ${ENV_FILE}`,
    );
  }

  // Con tildes `formatAddress` emite RFC 2047, y la doc de Resend no dice que lo decodifique.
  const name = filled(env.MAIL_FROM_NAME) ?? DEFAULT_FROM.name;
  if (!/^[\x20-\x7e]*$/.test(name)) {
    throw new MailEnvError(`MAIL_FROM_NAME tiene que ser ASCII con MAIL_TRANSPORT=resend ${ENV_FILE}`);
  }

  return { transport, resend: { apiKey }, from: { email, name } };
}
