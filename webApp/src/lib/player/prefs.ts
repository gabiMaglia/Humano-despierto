// Preferencias de dispositivo del player (T-045): localStorage, no DB. Todo en try/catch porque
// en modo privado o con datos bloqueados el acceso al storage puede tirar.

export interface PrefsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const RATE_KEY = "hd.player.rate";
const AUTOPLAY_KEY = "hd.player.autoplay";

function defaultStorage(): PrefsStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readRate(storage: PrefsStorage | null = defaultStorage()): number | null {
  try {
    const raw = storage?.getItem(RATE_KEY);
    if (!raw) return null;
    const rate = Number(raw);
    // YouTube admite de 0.25 a 2×; fuera de ese rango el valor guardado es basura.
    return Number.isFinite(rate) && rate >= 0.25 && rate <= 2 ?rate : null;
  } catch {
    return null;
  }
}

export function writeRate(rate: number, storage: PrefsStorage | null = defaultStorage()): void {
  try {
    storage?.setItem(RATE_KEY, String(rate));
  } catch {
    // preferencia no persistida: la sesión sigue funcionando
  }
}

export function readAutoplay(storage: PrefsStorage | null = defaultStorage()): boolean {
  try {
    return storage?.getItem(AUTOPLAY_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeAutoplay(on: boolean, storage: PrefsStorage | null = defaultStorage()): void {
  try {
    storage?.setItem(AUTOPLAY_KEY, on ? "1" : "0");
  } catch {
    // idem writeRate
  }
}
