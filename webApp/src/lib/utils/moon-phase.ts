const PHASES = ["○", "◑", "●", "◐"] as const;
export type MoonPhase = (typeof PHASES)[number];

const KNOWN_NEW_MOON = new Date(2000, 0, 6).getTime();
const LUNAR_CYCLE_MS = 29.53 * 24 * 60 * 60 * 1000;

export function getMoonPhase(date: Date = new Date()): MoonPhase {
  const elapsed = ((date.getTime() - KNOWN_NEW_MOON) % LUNAR_CYCLE_MS + LUNAR_CYCLE_MS) % LUNAR_CYCLE_MS;
  return PHASES[Math.floor((elapsed / LUNAR_CYCLE_MS) * 4) % 4];
}
