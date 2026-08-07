const CURRENCY_SYMBOLS: Record<string, string> = {
  ARS: "$",
  USD: "US$",
};

export function formatPriceCents(cents: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${symbol} ${Math.round(cents / 100)}`;
}

export function formatDurationSeconds(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
}
