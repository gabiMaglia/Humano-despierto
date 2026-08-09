const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31536000],
  ["month", 2592000],
  ["week", 604800],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

export function formatRelativeTime(iso: string): string {
  const diffSeconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSeconds < 60) return "hace instantes";

  for (const [unit, secondsInUnit] of UNITS) {
    const delta = Math.floor(diffSeconds / secondsInUnit);
    if (delta >= 1) return rtf.format(-delta, unit);
  }
  return "hace instantes";
}
