import "server-only";
import { formatAddress, stripHeaderInjection } from "@/lib/mail/address.mjs";
import { assertTransportTimeout, TRANSPORT_TIMEOUT_MS } from "@/lib/server/mail/limits";
import { MailTransportError, type MailMessage, type MailTransport } from "@/lib/server/mail/transport";
import { log } from "@/lib/server/log";

// ADR-014 · Resend por su API HTTP con `fetch`, sin SDK. No reintenta: eso es de `mail_log`.
// Firmas verificadas en Context7 (`/llmstxt/resend_llms_txt`, `/websites/resend`) el 2026-10-21.

const RESEND_API = "https://api.resend.com";
const MAX_ERROR_LENGTH = 300;

export interface ResendTransportOptions {
  apiKey: string;
  /** Solo para tests. Ningún env lo cambia: sería una forma de mandar la clave a otro host. */
  baseUrl?: string;
  timeoutMs?: number;
}

/** `true` = permanente. 409 concurrente es "la misma clave sigue en vuelo": reintentar luego. */
export function classifyResendStatus(status: number, name?: string): boolean {
  if (status === 429 || status >= 500) return false;
  if (status === 409 && name === "concurrent_idempotent_requests") return false;
  return status >= 400;
}

function parseJson(raw: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const str = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

export class ResendTransport implements MailTransport {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: ResendTransportOptions) {
    const apiKey = options.apiKey.trim();
    if (!apiKey) throw new Error("ResendTransport: falta la API key");
    this.timeoutMs = options.timeoutMs ?? TRANSPORT_TIMEOUT_MS;
    assertTransportTimeout(this.timeoutMs);
    this.apiKey = apiKey;
    this.baseUrl = options.baseUrl ?? RESEND_API;
  }

  async send(message: MailMessage): Promise<void> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
    if (message.idempotencyKey) headers["Idempotency-Key"] = message.idempotencyKey;

    // `to` sin display-name: la doc solo muestra direcciones peladas ahí.
    const payload = {
      from: formatAddress(message.from),
      to: [stripHeaderInjection(message.to.email)],
      subject: message.subject,
      html: message.html,
      text: message.text,
    };

    // Una sola señal para conexión, cabeceras Y cuerpo: un servidor que manda 200 y nunca
    // termina el body tiene que cortar igual que uno mudo.
    const signal = AbortSignal.timeout(this.timeoutMs);
    let status: number;
    let statusText: string;
    let raw: string;
    try {
      const res = await fetch(`${this.baseUrl}/emails`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal,
        // Seguir un redirect mandaría la clave a un host que no es Resend.
        redirect: "error",
      });
      status = res.status;
      statusText = res.statusText;
      raw = await res.text();
    } catch (err) {
      if (signal.aborted) throw new MailTransportError(`Resend: sin respuesta en ${this.timeoutMs}ms`, false);
      const code = str((err as { cause?: { code?: unknown } })?.cause?.code);
      throw new MailTransportError(`Resend: falla de red${code ? ` (${code})` : ""}`, false, undefined, code);
    }

    const body = parseJson(raw);

    if (status >= 200 && status < 300) {
      const id = str(body?.id);
      if (id) await log.info("mail_sent", { provider: "resend", provider_id: id });
      // 2xx es aceptado: reintentar sería peor, y la idempotencia lo absorbería igual.
      else await log.warn("mail_provider_unparsed_response", { provider: "resend", status });
      return;
    }

    const name = str(body?.name);
    const permanent = classifyResendStatus(status, name);
    if (status === 401) {
      throw new MailTransportError("Resend: RESEND_API_KEY rechazada (401)", true, status, name);
    }
    const detail = `${name ?? statusText}: ${str(body?.message) ?? statusText}`;
    const text = `Resend: ${status} ${detail}`.split(this.apiKey).join("[redactado]").slice(0, MAX_ERROR_LENGTH);
    throw new MailTransportError(text, permanent, status, name);
  }
}
