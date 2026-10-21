// Validación pura de la config de mail (ADR-014). Recibe el env por parámetro y no importa nada
// de `server/`: la usa `instrumentation.ts`, que no compila con `react-server` y donde
// `server-only` lanzaría. Los mensajes nunca incluyen valores, solo nombres de variables.

export interface MailFrom {
  email: string;
  name: string;
}

export type MailConfig =
  | { transport: "smtp"; smtp: { host: string; port: number } | null; from: MailFrom }
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

function parseSmtp(env: Env): { host: string; port: number } | null {
  const host = filled(env.SMTP_HOST);
  const port = Number(env.SMTP_PORT);
  if (!host || !Number.isInteger(port) || port <= 0) return null;
  // El SMTP casero no tiene AUTH ni STARTTLS: contra un MTA real mandaría en claro.
  if (env.NODE_ENV === "production" && !LOOPBACK.has(host.toLowerCase())) {
    throw new MailEnvError(
      `SMTP_HOST fuera de loopback con NODE_ENV=production: el SMTP casero es solo para Mailpit local; en producción MAIL_TRANSPORT=resend (ADR-014) ${ENV_FILE}`,
    );
  }
  return { host, port };
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
