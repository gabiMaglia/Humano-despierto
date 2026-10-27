import { vi } from "vitest";

export interface ChainCall {
  method: string;
  args: unknown[];
}

/**
 * Builder falso de supabase-js. Cada método encadenable registra la llamada y devuelve el mismo
 * objeto; `await`, `.maybeSingle()` y `.single()` resuelven con lo que devuelva `resolve` mirando
 * las llamadas. Existe para afirmar QUÉ filtros mandó el código (el estado de origen de una
 * transición, el `user_id` de sesión), no solo qué hizo con la respuesta.
 */
export function queryChain(resolve: (calls: ChainCall[]) => unknown) {
  const calls: ChainCall[] = [];
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "insert", "update", "upsert", "eq", "neq", "in", "is", "order", "range"]) {
    chain[method] = vi.fn((...args: unknown[]) => {
      calls.push({ method, args });
      return chain;
    });
  }
  chain.maybeSingle = vi.fn(async () => resolve(calls));
  chain.single = vi.fn(async () => resolve(calls));
  chain.then = (onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) =>
    Promise.resolve(resolve(calls)).then(onFulfilled, onRejected);
  return { chain, calls };
}

export const argsOf = (calls: ChainCall[], method: string): unknown[] | undefined =>
  calls.find((c) => c.method === method)?.args;
