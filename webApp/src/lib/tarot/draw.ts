export type Rng = () => number;

export const DECK_SIZE = 78;
export const REVERSED_PROBABILITY = 1 / 3;

// Fisher-Yates sobre los índices del dataset. El rng se inyecta para que los tests sean deterministas.
export function shuffleDeck(rng: Rng): number[] {
  const deck = [...Array(DECK_SIZE).keys()];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
  }
  return deck;
}

export function drawReversed(rng: Rng, enabled: boolean): boolean {
  return enabled && rng() < REVERSED_PROBABILITY;
}

/** rng criptográfico para el navegador; en Node también existe `globalThis.crypto`. */
export function cryptoRng(): Rng {
  const buf = new Uint32Array(1);
  return () => {
    globalThis.crypto.getRandomValues(buf);
    return buf[0]! / 2 ** 32;
  };
}
