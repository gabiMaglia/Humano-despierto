import { describe, expect, it } from "vitest";
import { isBackToTopVisible, isHeaderSolid } from "./header";

describe("isHeaderSolid", () => {
  it("sin hero el header es sólido siempre", () => {
    expect(isHeaderSolid({ scrollY: 0, viewportHeight: 900, overHero: false })).toBe(true);
  });

  it("sobre el hero es transparente hasta pasar el 85% de la pantalla", () => {
    expect(isHeaderSolid({ scrollY: 0, viewportHeight: 1000, overHero: true })).toBe(false);
    expect(isHeaderSolid({ scrollY: 850, viewportHeight: 1000, overHero: true })).toBe(false);
    expect(isHeaderSolid({ scrollY: 851, viewportHeight: 1000, overHero: true })).toBe(true);
  });
});

describe("isBackToTopVisible", () => {
  it("aparece pasado los 600px", () => {
    expect(isBackToTopVisible(0)).toBe(false);
    expect(isBackToTopVisible(600)).toBe(false);
    expect(isBackToTopVisible(601)).toBe(true);
  });
});
