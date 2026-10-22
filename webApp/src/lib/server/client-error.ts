import "server-only";
import { headers } from "next/headers";
import { log } from "@/lib/server/log";

const MAX_PER_WINDOW = 10;
const WINDOW_MS = 60_000;
const MAX_MESSAGE = 500;
const MAX_PATH = 200;

// Limite en memoria por proceso, a proposito: T-050 (rate limiting en Postgres) todavia no esta
// en esta rama. Cuando llegue, este Map se reemplaza por su `limit()`.
const hits = new Map<string, { count: number; resetAt: number }>();

export function resetClientErrorLimiter() {
  hits.clear();
}

async function clientIp(): Promise<string> {
  try {
    const h = await headers();
    return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  } catch {
    return "unknown";
  }
}

function allowed(ip: string, now: number): boolean {
  const slot = hits.get(ip);
  if (!slot || slot.resetAt <= now) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  slot.count += 1;
  return slot.count <= MAX_PER_WINDOW;
}

/** Recibe lo que un error.tsx vio en el navegador. Es anonimo y sin stack ni PII: el exceso se
 * descarta en silencio (ruido, no incidente). */
export async function reportClientError(input: { digest?: string; message?: string; path?: string }): Promise<void> {
  if (typeof input !== "object" || input === null) return;
  const { digest, message, path } = input;
  if (typeof message !== "string" && typeof digest !== "string") return;
  if (!allowed(await clientIp(), Date.now())) return;
  await log.error("client_error", {
    digest: typeof digest === "string" ? digest.slice(0, 100) : null,
    message: typeof message === "string" ? message.slice(0, MAX_MESSAGE) : null,
    path: typeof path === "string" ? path.split("?")[0].slice(0, MAX_PATH) : null,
  });
}
