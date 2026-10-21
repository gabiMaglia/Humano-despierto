import { describe, expect, it } from "vitest";
import { aggregateRatings, formatRating } from "@/lib/reviews/rating";

describe("formatRating", () => {
  it("sin reseñas no devuelve nada: un número inventado es peor que ninguno", () => {
    expect(formatRating(0, 0)).toBeNull();
  });
  it("usa coma decimal y plural", () => {
    expect(formatRating(4.8, 12)).toBe("4,8 · 12 reseñas");
  });
  it("singular con una reseña", () => {
    expect(formatRating(5, 1)).toBe("5,0 · 1 reseña");
  });
});

describe("aggregateRatings", () => {
  it("agrupa por curso y redondea a una decimal igual que la ficha", () => {
    const m = aggregateRatings([
      { course_id: "a", rating: 5 },
      { course_id: "a", rating: 4 },
      { course_id: "a", rating: 4 },
      { course_id: "b", rating: 3 },
    ]);
    expect(m.get("a")).toEqual({ average: 4.3, total: 3 });
    expect(m.get("b")).toEqual({ average: 3, total: 1 });
    expect(m.get("c")).toBeUndefined();
  });
});
