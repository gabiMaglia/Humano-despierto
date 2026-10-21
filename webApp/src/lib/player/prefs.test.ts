import { describe, expect, it } from "vitest";
import { readAutoplay, readRate, writeAutoplay, writeRate, type PrefsStorage } from "./prefs";

function memory(initial: Record<string, string> = {}): PrefsStorage {
  const data = { ...initial };
  return {
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => void (data[k] = v),
  };
}

const throwing: PrefsStorage = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("QuotaExceeded");
  },
};

describe("rate", () => {
  it("round-trip por la clave hd.player.rate", () => {
    const s = memory();
    writeRate(1.5, s);
    expect(s.getItem("hd.player.rate")).toBe("1.5");
    expect(readRate(s)).toBe(1.5);
  });

  it.each([["abc"], ["0"], ["-1"], ["NaN"], ["17"], [""]])("valor guardado invalido %j => null", (raw) => {
    expect(readRate(memory({ "hd.player.rate": raw }))).toBeNull();
  });

  it("sin valor => null", () => expect(readRate(memory())).toBeNull());

  it("storage que tira (modo privado) no rompe: null y escribir es no-op", () => {
    expect(readRate(throwing)).toBeNull();
    expect(() => writeRate(2, throwing)).not.toThrow();
  });
});

describe("autoplay", () => {
  it("default desactivado", () => expect(readAutoplay(memory())).toBe(false));

  it("round-trip por la clave hd.player.autoplay", () => {
    const s = memory();
    writeAutoplay(true, s);
    expect(s.getItem("hd.player.autoplay")).toBe("1");
    expect(readAutoplay(s)).toBe(true);
    writeAutoplay(false, s);
    expect(readAutoplay(s)).toBe(false);
  });

  it("storage que tira => false", () => expect(readAutoplay(throwing)).toBe(false));
});
