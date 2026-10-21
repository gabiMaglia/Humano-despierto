/**
 * Como `Promise.allSettled`, pero con a lo sumo `limit` trabajos en vuelo. Es un pool, no tandas:
 * en tandas un envío colgado 15 s frena a los otros cuatro de su tanda aunque ya hayan terminado.
 */
export async function settleWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError(`settleWithConcurrency: limit tiene que ser un entero >= 1 (vino ${limit})`);
  }
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;

  async function lane(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { status: "fulfilled", value: await worker(items[i], i) };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
  return results;
}
