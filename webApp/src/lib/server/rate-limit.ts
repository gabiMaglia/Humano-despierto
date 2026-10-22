import "server-only";
import { getAdminSupabaseClient } from "@/lib/server/supabase-admin";
import { currentRateLimitSubject } from "@/lib/server/rate-limit-subject";
import { log } from "@/lib/server/log";
import { RATE_LIMITS, type RateLimitName } from "@/lib/rate-limit/limits";
import {
  MemoryRateLimiter,
  RATE_LIMITED,
  rateLimitKey,
  rateLimitMessage,
  type RateLimitDenied,
  type RateLimiter,
  type RateLimitResult,
  type RateLimitRule,
  type RateLimitSubject,
} from "@/lib/rate-limit/core";

export interface CheckRateLimitArgs {
  p_key: string;
  p_max: number;
  p_window_seconds: number;
}

export type CheckRateLimitRpc = (
  args: CheckRateLimitArgs,
  signal: AbortSignal,
) => PromiseLike<{ data: unknown; error: { message: string } | null }>;

interface CheckRateLimitRow {
  allowed: boolean;
  remaining: number;
  retry_after_seconds: number;
}

function isRow(value: unknown): value is CheckRateLimitRow {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return typeof r.allowed === "boolean" && typeof r.remaining === "number" && typeof r.retry_after_seconds === "number";
}

/** `check_rate_limit` (migración T-050) por service_role. Lanza ante cualquier respuesta que no sea
 * la fila esperada: decidir qué hacer con eso es de `createLimit`, no de acá. */
export class PostgresRateLimiter implements RateLimiter {
  private readonly rpc: CheckRateLimitRpc;
  private readonly timeoutMs: number;

  constructor(rpc: CheckRateLimitRpc, timeoutMs = 1500) {
    this.rpc = rpc;
    this.timeoutMs = timeoutMs;
  }

  async hit(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
    const { data, error } = await this.rpc(
      { p_key: key, p_max: rule.max, p_window_seconds: rule.windowSeconds },
      AbortSignal.timeout(this.timeoutMs),
    );
    if (error) throw new Error(`check_rate_limit: ${error.message}`);
    const row = Array.isArray(data) ? data[0] : undefined;
    if (!isRow(row)) throw new Error("check_rate_limit: la respuesta no trae la fila esperada");
    return row.allowed
      ? { ok: true, remaining: row.remaining, retryAfter: 0 }
      : { ok: false, remaining: 0, retryAfter: Math.max(1, row.retry_after_seconds) };
  }
}

const viaServiceRole: CheckRateLimitRpc = (args, signal) =>
  getAdminSupabaseClient().rpc("check_rate_limit", args).abortSignal(signal);

export interface LimitDeps {
  deadlineMs: number;
  log: (event: string, fields: Record<string, unknown>) => void;
}

/**
 * Fail-open deliberado (spec T-050 c.5): un limitador caído o mudo no puede tumbar la app, así que
 * se deja pasar y queda registrado. El plazo propio cubre a un limitador que ignore su señal de corte.
 */
export function createLimit(limiter: RateLimiter, deps: LimitDeps) {
  return async function limitWith(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        limiter.hit(key, rule),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error(`sin respuesta en ${deps.deadlineMs} ms`)), deps.deadlineMs);
        }),
      ]);
    } catch (err) {
      deps.log("rate_limit_backend_down", { key, error: err instanceof Error ? err.message : String(err) });
      return { ok: true, remaining: rule.max, retryAfter: 0, degraded: true };
    } finally {
      clearTimeout(timer);
    }
  };
}

let cachedLimiter: RateLimiter | null = null;

function getLimiter(): RateLimiter {
  if (cachedLimiter) return cachedLimiter;
  const backend = process.env.RATE_LIMIT_BACKEND;
  if (backend === "memory") {
    if (process.env.NODE_ENV === "production") {
      void log.error("rate_limit_memory_backend_in_production");
    }
    cachedLimiter = new MemoryRateLimiter();
  } else {
    if (backend && backend !== "postgres") {
      void log.error("rate_limit_backend_unknown", { backend });
    }
    cachedLimiter = new PostgresRateLimiter(viaServiceRole);
  }
  return cachedLimiter;
}

// Mayor que el timeout del rpc (1500 ms): si el abort funciona, este plazo no gana nunca.
const DEADLINE_MS = 2000;

export function limit(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
  return createLimit(getLimiter(), { deadlineMs: DEADLINE_MS, log: (event, fields) => void log.error(event, fields) })(key, rule);
}

export class RateLimitError extends Error {
  readonly code = RATE_LIMITED;
  readonly retryAfter: number;

  constructor(denied: RateLimitDenied) {
    super(rateLimitMessage(denied.retryAfter));
    this.name = "RateLimitError";
    this.retryAfter = denied.retryAfter;
  }
}

function throwRateLimited(denied: RateLimitDenied): never {
  throw new RateLimitError(denied);
}

export interface WithRateLimitOptions<A extends unknown[]> {
  /** Quién gasta el cupo, si no es el de la sesión. Para lo que llega sin sesión por diseño (reportes
   * del navegador): evita un viaje a GoTrue por pedido. */
  subject?: (...args: A) => RateLimitSubject | Promise<RateLimitSubject>;
}

/**
 * Envuelve una Server Action (o un Route Handler): el cupo se gasta ANTES de validar y de tocar la
 * base, así un pedido inválido también cuenta. El límite sale de `RATE_LIMITS` por nombre; el guard
 * (`lib/rate-limit/coverage.ts`) exige que el nombre sea el del export.
 */
export function withRateLimit<A extends unknown[], R>(
  name: RateLimitName,
  fn: (...args: A) => Promise<R>,
  onLimited: (denied: RateLimitDenied) => R = throwRateLimited,
  options: WithRateLimitOptions<A> = {},
): (...args: A) => Promise<R> {
  const rule = RATE_LIMITS[name];
  return async (...args: A): Promise<R> => {
    const who = options.subject ? await options.subject(...args) : await currentRateLimitSubject();
    const result = await limit(rateLimitKey(name, who), rule);
    if (!result.ok) return onLimited(result);
    return fn(...args);
  };
}

/** Solo para tests: vuelve a elegir backend con el entorno actual y vacía el de memoria. */
export function __resetRateLimiterForTests(): void {
  cachedLimiter = null;
}
