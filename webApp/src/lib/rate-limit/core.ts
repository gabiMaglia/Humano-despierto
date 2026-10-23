/**
 * Piezas puras del rate limiting (T-050). Sin `server-only` ni Next: Vitest las prueba sin mocks y
 * los estados de formulario del cliente importan sus tipos.
 *
 * Lo que esta capa NO limita: registro, login, recuperación de clave y OAuth. Los limita GoTrue por
 * IP (`supabase/config.toml [auth.rate_limit]`, local: `sign_in_sign_ups = 30` y
 * `token_verifications = 30` cada 5 min, `email_sent = 30` por hora; en la nube se fijan en el
 * dashboard). Duplicarlo acá no cierra nada nuevo y le cambia la respuesta neutra a "recuperar".
 */

export const RATE_LIMITED = "rate_limited" as const;

export interface RateLimitRule {
  max: number;
  windowSeconds: number;
}

export type RateLimitResult =
  | { ok: true; remaining: number; retryAfter: 0; degraded?: true }
  | { ok: false; remaining: 0; retryAfter: number };

export type RateLimitDenied = Extract<RateLimitResult, { ok: false }>;

export interface RateLimiter {
  hit(key: string, rule: RateLimitRule): Promise<RateLimitResult>;
}

export type RateLimitSubject = { kind: "user"; id: string } | { kind: "ip"; ip: string };

/** Lo que suma la respuesta limitada a los estados `{ error, success }` de `useActionState`. */
export interface RateLimitFields {
  code?: typeof RATE_LIMITED;
  retryAfter?: number;
}

export function windowBounds(nowMs: number, windowSeconds: number): { start: number; end: number } {
  const size = windowSeconds * 1000;
  const start = Math.floor(nowMs / size) * size;
  return { start, end: start + size };
}

function decide(hits: number, rule: RateLimitRule, nowMs: number, endMs: number): RateLimitResult {
  if (hits <= rule.max) return { ok: true, remaining: rule.max - hits, retryAfter: 0 };
  return { ok: false, remaining: 0, retryAfter: Math.max(1, Math.ceil((endMs - nowMs) / 1000)) };
}

const SWEEP_AT = 10_000;

/** Misma semántica que `check_rate_limit`, en el proceso. Solo para Vitest o
 * `RATE_LIMIT_BACKEND=memory` explícito: se resetea al reiniciar y no se comparte entre instancias. */
export class MemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, { start: number; end: number; hits: number }>();
  private readonly now: () => number;

  constructor(now: () => number = Date.now) {
    this.now = now;
  }

  async hit(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
    const t = this.now();
    const { start, end } = windowBounds(t, rule.windowSeconds);
    const prev = this.buckets.get(key);
    const hits = prev && prev.start === start ? prev.hits + 1 : 1;
    this.buckets.set(key, { start, end, hits });
    if (this.buckets.size > SWEEP_AT) {
      for (const [k, b] of this.buckets) if (b.end <= t) this.buckets.delete(k);
    }
    return decide(hits, rule, t, end);
  }
}

const ACTION_NAME = /^[A-Za-z][A-Za-z0-9]{0,63}$/;

export function rateLimitKey(action: string, subject: RateLimitSubject): string {
  if (!ACTION_NAME.test(action)) throw new Error(`rateLimitKey: nombre de action inválido (${action})`);
  return subject.kind === "user" ? `${action}:u:${subject.id}` : `${action}:ip:${subject.ip}`;
}

const IP = /^[0-9A-Fa-f:.]{2,45}$/;

/**
 * IP para las claves sin sesión: primer valor de `x-forwarded-for`, si no `x-real-ip`. Lo que no
 * tiene forma de IP cae en `unknown`. Sin proxy delante (local) todos comparten ese bucket. Detrás
 * de un proxy que AGREGA a `x-forwarded-for` en vez de reemplazarlo, el primer valor lo elige el
 * cliente: el proxy del despliegue (D4) tiene que reemplazarlo.
 */
export function clientIpFrom(headers: Pick<Headers, "get">): string {
  for (const raw of [headers.get("x-forwarded-for")?.split(",")[0], headers.get("x-real-ip")]) {
    const ip = raw?.trim();
    if (ip && IP.test(ip)) return ip;
  }
  return "unknown";
}

export function rateLimitMessage(retryAfterSeconds: number): string {
  const s = Math.max(1, Math.ceil(retryAfterSeconds));
  if (s < 90) return `Demasiados intentos. Esperá ${s} ${s === 1 ? "segundo" : "segundos"} y volvé a probar.`;
  return `Demasiados intentos. Esperá ${Math.ceil(s / 60)} minutos y volvé a probar.`;
}

/** Respuesta limitada para las actions de formulario: el mensaje va en `error`, que es lo que
 * cada formulario ya pinta. */
export function limitedState(denied: RateLimitDenied) {
  return {
    error: rateLimitMessage(denied.retryAfter),
    success: null,
    code: RATE_LIMITED,
    retryAfter: denied.retryAfter,
  };
}
