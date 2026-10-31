import "server-only";
import { headers } from "next/headers";

type Level = "info" | "warn" | "error";

// Claves cuyo valor jamas debe llegar a un log, sea cual sea el nivel de anidado.
const SENSITIVE = /(api_?key|token|secret|password|passwd|^pass$|smtp_pass|authorization|cookie|^code$|^jwt$|service_role)/i;

// D-48 · Redaccion por VALOR, no solo por clave: un JWT o el mail de la alumna llegan adentro de
// `err.message`/`stack` (SMTP y Resend repiten el destinatario), bajo claves inocentes.
const JWT = /\beyJ[A-Za-z0-9_-]{5,}(?:\.[A-Za-z0-9_-]*){0,2}/g;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;

function redactValue(s: string): string {
  return s.replace(JWT, "[redacted-jwt]").replace(EMAIL, "[redacted-email]");
}

function serialize(value: unknown, seen: WeakSet<object>): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactValue(value.message),
      stack: value.stack === undefined ? undefined : redactValue(value.stack),
    };
  }
  if (typeof value === "string") return redactValue(value);
  if (typeof value === "bigint") return value.toString();
  if (typeof value !== "object" || value === null) return value;
  if (seen.has(value)) return "[circular]";
  seen.add(value);
  if (Array.isArray(value)) return value.map((v) => serialize(v, seen));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) out[k] = SENSITIVE.test(k) ? "[redacted]" : serialize(v, seen);
  return out;
}

async function requestId(): Promise<string | null> {
  // Fuera de un request `headers()` lanza.
  try {
    return (await headers()).get("x-request-id");
  } catch {
    return null;
  }
}

// Devuelve promesa porque `headers()` es async; nunca rechaza, asi que se puede llamar sin await.
async function write(level: Level, event: string, fields?: Record<string, unknown>) {
  try {
    const safe = (serialize(fields ?? {}, new WeakSet()) ?? {}) as Record<string, unknown>;
    const line = JSON.stringify({ ...safe, ts: new Date().toISOString(), level, event, request_id: await requestId() });
    if (level === "info") console.info(line);
    else if (level === "warn") console.warn(line);
    else console.error(line);
  } catch {
    // El log no puede romper la operacion que lo dispara.
  }
}

export const log = {
  info: (event: string, fields?: Record<string, unknown>) => write("info", event, fields),
  warn: (event: string, fields?: Record<string, unknown>) => write("warn", event, fields),
  error: (event: string, fields?: Record<string, unknown>) => write("error", event, fields),
};
