import { describe, expect, it } from "vitest";
import { REVERSED_PROBABILITY, drawReversed, shuffleDeck } from "./draw";

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe("shuffleDeck", () => {
  it("devuelve una permutación de 0..77 sin repetidos", () => {
    const deck = shuffleDeck(lcg(7));
    expect(deck).toHaveLength(78);
    expect([...deck].sort((a, b) => a - b)).toEqual([...Array(78).keys()]);
  });

  it("es determinista para el mismo rng", () => {
    expect(shuffleDeck(lcg(42))).toEqual(shuffleDeck(lcg(42)));
    expect(shuffleDeck(lcg(42))).not.toEqual(shuffleDeck(lcg(43)));
  });
});

describe("drawReversed", () => {
  it("nunca invierte si está apagado", () => {
    const rng = lcg(1);
    for (let i = 0; i < 1000; i++) expect(drawReversed(rng, false)).toBe(false);
  });

  it("invierte alrededor de un tercio de las veces con Math.random", () => {
    let n = 0;
    for (let i = 0; i < 10_000; i++) if (drawReversed(Math.random, true)) n++;
    expect(n / 10_000).toBeGreaterThan(REVERSED_PROBABILITY - 0.03);
    expect(n / 10_000).toBeLessThan(REVERSED_PROBABILITY + 0.03);
  });
});
