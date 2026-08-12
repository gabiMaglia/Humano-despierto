import "server-only";
import { SmtpTransport, type MailTransport, type MailMessage } from "@/lib/server/mail/transport";

// T-020 criterio 2: "el envío no puede romper la operación". Este módulo es el ÚNICO choke
// point de mail de toda la app — cada `notify*` de `notify.ts` llama a `sendMail`, nunca al
// transporte directo. `sendMail` no tira NUNCA: atrapa cualquier error de transporte y devuelve
// `{ok:false}`, así que quien llama (inscripción, registro, progreso de lección) no necesita
// acordarse de envolver el envío en un try/catch propio — la garantía vive acá, una sola vez,
// no repetida en cada call site (donde alguien se puede llegar a olvidar).

export interface SendResult {
  ok: boolean;
  error?: string;
}

let cachedTransport: MailTransport | null = null;

/** Config por variables de entorno (criterio 5): nunca `NEXT_PUBLIC_`, esto no corre en el
 * browser. Sin `SMTP_HOST`/`SMTP_PORT` no hay transporte configurado — se trata como una falla
 * de envío más, no como un crash del arranque de la app. */
function getTransport(): MailTransport {
  if (cachedTransport) return cachedTransport;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  if (!host || !Number.isFinite(port) || port <= 0) {
    throw new Error(
      "SMTP_HOST/SMTP_PORT no configurados (webApp/.env.local) — no hay transporte de mail."
    );
  }

  cachedTransport = new SmtpTransport({ host, port });
  return cachedTransport;
}

function getFromAddress(): MailMessage["from"] {
  return {
    email: process.env.MAIL_FROM_ADDRESS || "no-responder@humano-despierto.local",
    name: process.env.MAIL_FROM_NAME || "Humano Despierto",
  };
}

export interface SendMailInput {
  to: MailMessage["to"];
  subject: string;
  html: string;
  text: string;
}

/**
 * Envía un mail. NUNCA rechaza la promesa — cualquier falla de transporte (SMTP caído, DNS,
 * timeout, config ausente) se atrapa acá y se loguea; el resultado es informativo, no una
 * excepción que el caller tenga que manejar para no romper su propia operación.
 */
export async function sendMail(input: SendMailInput): Promise<SendResult> {
  try {
    const transport = getTransport();
    await transport.send({ ...input, from: getFromAddress() });
    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[mail] envío a ${input.to.email} falló, no se reintenta: ${error}`);
    return { ok: false, error };
  }
}

/** Solo para tests: fuerza qué transporte usa `sendMail` (p.ej. uno que tira siempre, para
 * probar que un SMTP roto no rompe la operación) y para resetear el cache entre casos. */
export function __setTransportForTests(transport: MailTransport | null): void {
  cachedTransport = transport;
}
