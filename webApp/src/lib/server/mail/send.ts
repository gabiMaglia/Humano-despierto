import "server-only";
import { getMailConfig } from "@/lib/server/env";
import { HARD_CAP_MS, TRANSPORT_TIMEOUT_MS } from "@/lib/server/mail/limits";
import { MailTransportError, SmtpTransport, type MailTransport, type MailMessage } from "@/lib/server/mail/transport";
import { ResendTransport } from "@/lib/server/mail/transport-resend";

// T-020 criterio 2: "el envío no puede romper la operación". Este módulo es el ÚNICO choke
// point de mail de toda la app — cada `notify*` de `notify.ts` llama a `sendMail`, nunca al
// transporte directo. `sendMail` no tira NUNCA: atrapa cualquier error de transporte y devuelve
// `{ok:false}`, así que quien llama (inscripción, registro, progreso de lección) no necesita
// acordarse de envolver el envío en un try/catch propio — la garantía vive acá, una sola vez,
// no repetida en cada call site (donde alguien se puede llegar a olvidar).

export interface SendResult {
  ok: boolean;
  error?: string;
  /** Reintentar no cambia nada: `notify.ts` retira el turno de `mail_log` (ADR-014). */
  permanent?: true;
  status?: number;
  code?: string;
}

interface Resolved {
  transport: MailTransport;
  /** `null` cuando el transporte lo inyectó un test: el remitente sale del env igual. */
  from: MailMessage["from"] | null;
}

let cached: Resolved | null = null;

/** `MAIL_TRANSPORT` elige (ADR-014). Sin `SMTP_HOST`/`SMTP_PORT` no hay transporte: es una falla
 * de envío más, no un crash del arranque. Una config inválida para `resend` ya la frenó
 * `register()`; si igual llega acá, `getMailConfig` lanza y `sendMail` lo atrapa. */
function resolveTransport(): Resolved {
  if (cached) return cached;
  const config = getMailConfig();
  if (config.transport === "resend") {
    cached = {
      transport: new ResendTransport({ apiKey: config.resend.apiKey, timeoutMs: TRANSPORT_TIMEOUT_MS }),
      from: config.from,
    };
    return cached;
  }
  if (!config.smtp) {
    throw new Error("SMTP_HOST/SMTP_PORT no configurados (webApp/.env.local) — no hay transporte de mail.");
  }
  cached = { transport: new SmtpTransport({ ...config.smtp, timeoutMs: TRANSPORT_TIMEOUT_MS }), from: config.from };
  return cached;
}

export interface SendMailInput {
  to: MailMessage["to"];
  subject: string;
  html: string;
  text: string;
  idempotencyKey?: string;
}

/**
 * Envía un mail. NUNCA rechaza la promesa — cualquier falla de transporte (SMTP caído, DNS,
 * timeout, config ausente, 4xx/5xx de Resend) se atrapa acá y se loguea; el resultado es
 * informativo, no una excepción que el caller tenga que manejar para no romper su propia
 * operación. Tampoco cuelga más de `HARD_CAP_MS`: cada transporte ya corta antes (E1); este
 * `race` es la malla para uno que no cumpla su invariante.
 */
export async function sendMail(input: SendMailInput): Promise<SendResult> {
  try {
    const { transport, from } = resolveTransport();
    await Promise.race([
      transport.send({ ...input, from: from ?? getMailConfig().from }),
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error(`sendMail: tope duro de ${HARD_CAP_MS}ms superado`)),
          HARD_CAP_MS
        ).unref?.();
      }),
    ]);
    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const providerError = err instanceof MailTransportError ? err : null;
    // Nunca la dirección del destinatario en un log.
    console.error("mail_send_failed", {
      error,
      permanent: providerError?.permanent ?? false,
      status: providerError?.status,
    });
    if (providerError?.permanent) {
      return { ok: false, error, permanent: true, status: providerError.status, code: providerError.code };
    }
    return { ok: false, error };
  }
}

/** Solo para tests: fuerza qué transporte usa `sendMail` (p.ej. uno que tira siempre, para
 * probar que un SMTP roto no rompe la operación) y, con `null`, resetea el cache entre casos. */
export function __setTransportForTests(transport: MailTransport | null): void {
  cached = transport ? { transport, from: null } : null;
}
