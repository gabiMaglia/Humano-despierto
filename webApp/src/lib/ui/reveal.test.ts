import { describe, expect, it } from "vitest";
import { shouldDeferReveal } from "./reveal";

describe("shouldDeferReveal", () => {
  it("lo que ya se ve al cargar no se oculta nunca", () => {
    expect(shouldDeferReveal({ top: 0, viewportHeight: 800, reducedMotion: false })).toBe(false);
    expect(shouldDeferReveal({ top: 800, viewportHeight: 800, reducedMotion: false })).toBe(false);
    expect(shouldDeferReveal({ top: -300, viewportHeight: 800, reducedMotion: false })).toBe(false);
  });

  it("sólo difiere lo que arranca debajo del pliegue", () => {
    expect(shouldDeferReveal({ top: 801, viewportHeight: 800, reducedMotion: false })).toBe(true);
  });

  it("con prefers-reduced-motion no difiere nada", () => {
    expect(shouldDeferReveal({ top: 5000, viewportHeight: 800, reducedMotion: true })).toBe(false);
  });
});
