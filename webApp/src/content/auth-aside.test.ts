import { describe, expect, it } from "vitest";
import { AUTH_ASIDE } from "./auth-aside";
import { PLACEHOLDER_PHOTOS } from "./placeholder-photos";

describe("AUTH_ASIDE", () => {
  it("usa sólo fotos de la lista verificada y nunca un retrato", () => {
    for (const a of Object.values(AUTH_ASIDE)) {
      const p = PLACEHOLDER_PHOTOS.find((x) => x.id === a.photoId);
      expect(p, a.photoId).toBeDefined();
      expect(p!.alt).not.toMatch(/retrato|mujer|hombre|persona|rostro/i);
    }
  });

  it("la frase es corta", () => {
    for (const a of Object.values(AUTH_ASIDE)) {
      expect(a.phrase.length).toBeGreaterThan(10);
      expect(a.phrase.length).toBeLessThanOrEqual(70);
    }
  });
});
