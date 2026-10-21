import { describe, it, expect } from "vitest";
import { progressPercent } from "./progress";

describe("progressPercent", () => {
  it("0/0 es 0, no NaN", () => expect(progressPercent(0, 0)).toBe(0));
  it("9 de 10 es 90", () => expect(progressPercent(9, 10)).toBe(90));
  it("10 de 10 es 100", () => expect(progressPercent(10, 10)).toBe(100));
  it("redondea al entero", () => expect(progressPercent(1, 3)).toBe(33));
});
