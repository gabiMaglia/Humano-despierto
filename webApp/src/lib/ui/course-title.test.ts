import { describe, expect, it } from "vitest";
import { courseFullTitle } from "./course-title";

describe("courseFullTitle", () => {
  it("suma la parte destacada al título, como la tarjeta del catálogo", () => {
    expect(courseFullTitle("Tarot", "iniciático")).toBe("Tarot iniciático");
  });
  it("sin parte destacada queda el título", () => {
    expect(courseFullTitle("Tarot", null)).toBe("Tarot");
    expect(courseFullTitle("Tarot", "  ")).toBe("Tarot");
  });
});
