import type { Element } from "./cards";

export type Dignity = "intensifica" | "refuerza" | "debilita" | "neutral";

const FRIENDS: Record<Element, Element> = { fuego: "aire", aire: "fuego", agua: "tierra", tierra: "agua" };
const ENEMIES: Record<Element, Element> = { fuego: "agua", agua: "fuego", aire: "tierra", tierra: "aire" };

export function dignityBetween(a: Element, b: Element): Dignity {
  if (a === b) return "intensifica";
  if (FRIENDS[a] === b) return "refuerza";
  if (ENEMIES[a] === b) return "debilita";
  return "neutral";
}
