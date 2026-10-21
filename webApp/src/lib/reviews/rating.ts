export interface RatingAggregate {
  average: number;
  total: number;
}

/** Una sola regla de redondeo para la ficha y la tarjeta: si difieren, el número miente (T-019 c.2). */
export function roundAverage(sum: number, total: number): number {
  return total > 0 ? Math.round((sum / total) * 10) / 10 : 0;
}

/** Null sin reseñas: no se dibuja ni "0,0" ni texto de relleno. */
export function formatRating(average: number, total: number): string | null {
  if (total <= 0) return null;
  return `${average.toFixed(1).replace(".", ",")} · ${total} ${total === 1 ? "reseña" : "reseñas"}`;
}

export function aggregateRatings(rows: { course_id: string; rating: number }[]): Map<string, RatingAggregate> {
  const acc = new Map<string, { sum: number; total: number }>();
  for (const r of rows) {
    const cur = acc.get(r.course_id) ?? { sum: 0, total: 0 };
    cur.sum += r.rating;
    cur.total += 1;
    acc.set(r.course_id, cur);
  }
  return new Map([...acc].map(([id, { sum, total }]) => [id, { average: roundAverage(sum, total), total }]));
}
