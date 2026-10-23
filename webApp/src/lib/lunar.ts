// Fase lunar por media sinodica, sin API ni dependencia. Referencia: Meeus, "Astronomical
// Algorithms" (2ª ed.), cap. 49: luna nueva de epoca 2000-01-06 18:14 UTC (JDE 2451550.1) y mes
// sinodico medio 29.530588853 dias. Sin correccion por la orbita eliptica el error es de hasta
// ~14 h: irrelevante para un calendario decorativo con fechas por dia.
export type LunarPhaseName = "new" | "crescent" | "half" | "gibbous" | "full";

export interface LunarPhase {
  phase: LunarPhaseName;
  waxing: boolean;
  /** Dias desde la luna nueva, en [0, SYNODIC). */
  age: number;
}

export interface LunarDay extends LunarPhase {
  date: Date;
  today: boolean;
}

const SYNODIC = 29.530588853;
const EPOCH_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);
const DAY_MS = 86_400_000;
const STEPS = 8;

const OCTANTS: { phase: LunarPhaseName; waxing: boolean }[] = [
  { phase: "new", waxing: true },
  { phase: "crescent", waxing: true },
  { phase: "half", waxing: true },
  { phase: "gibbous", waxing: true },
  { phase: "full", waxing: false },
  { phase: "gibbous", waxing: false },
  { phase: "half", waxing: false },
  { phase: "crescent", waxing: false },
];

export function lunarPhase(date: Date): LunarPhase {
  const days = (date.getTime() - EPOCH_NEW_MOON) / DAY_MS;
  const age = ((days % SYNODIC) + SYNODIC) % SYNODIC;
  // Octante centrado en cada fase principal: nueva = [-1/16, 1/16) del ciclo.
  const octant = Math.round((age / SYNODIC) * STEPS) % STEPS;
  return { ...OCTANTS[octant], age };
}

/** Hoy y los 7 saltos siguientes de ~3.7 dias (un octavo de ciclo). */
export function lunarDays(from: Date): LunarDay[] {
  return Array.from({ length: STEPS }, (_, i) => {
    const date = new Date(from.getTime() + (i * SYNODIC * DAY_MS) / STEPS);
    return { ...lunarPhase(date), date, today: i === 0 };
  });
}

const LABEL: Record<LunarPhaseName, [waxing: string, waning: string]> = {
  new: ["Luna nueva", "Luna nueva"],
  crescent: ["Creciente", "Menguante"],
  half: ["Cuarto creciente", "Cuarto menguante"],
  gibbous: ["Gibosa creciente", "Gibosa menguante"],
  full: ["Luna llena", "Luna llena"],
};

export function phaseLabel(phase: LunarPhaseName, waxing: boolean): string {
  return LABEL[phase][waxing ? 0 : 1];
}
