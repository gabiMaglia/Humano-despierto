import { describe, expect, it } from "vitest";
import { settleWithConcurrency } from "./concurrency";

const tick = () => new Promise((r) => setTimeout(r, 1));

describe("settleWithConcurrency", () => {
  it("nunca tiene más de `limit` trabajos en vuelo y los procesa todos", async () => {
    let enVuelo = 0;
    let maximo = 0;
    const vistos: number[] = [];
    await settleWithConcurrency([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 5, async (n) => {
      enVuelo++;
      maximo = Math.max(maximo, enVuelo);
      await tick();
      vistos.push(n);
      enVuelo--;
    });
    expect(maximo).toBe(5);
    expect(vistos.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("un rechazo no corta a los demás y queda en su posición", async () => {
    const r = await settleWithConcurrency(["a", "b", "c"], 2, async (x) => {
      if (x === "b") throw new Error("smtp");
      return x.toUpperCase();
    });
    expect(r.map((s) => s.status)).toEqual(["fulfilled", "rejected", "fulfilled"]);
    expect(r[0]).toEqual({ status: "fulfilled", value: "A" });
  });

  it("un lento no frena a los que vienen detrás (pool, no tandas)", async () => {
    const orden: string[] = [];
    let liberarLento: () => void = () => {};
    const lento = new Promise<void>((r) => (liberarLento = r));
    const todo = settleWithConcurrency(["lento", "r1", "r2", "r3"], 2, async (x) => {
      if (x === "lento") await lento;
      orden.push(x);
    });
    await tick();
    await tick();
    expect(orden).toEqual(["r1", "r2", "r3"]);
    liberarLento();
    await todo;
    expect(orden).toEqual(["r1", "r2", "r3", "lento"]);
  });

  it("lista vacía resuelve sin llamar al worker", async () => {
    expect(await settleWithConcurrency([], 5, async () => { throw new Error("no"); })).toEqual([]);
  });

  it.each([0, -1, 1.5])("limit inválido (%s) es un error de programación", async (limit) => {
    await expect(settleWithConcurrency([1], limit, async () => 1)).rejects.toThrow(RangeError);
  });
});
