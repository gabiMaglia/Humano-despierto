import { describe, expect, it } from "vitest";
import { dignityBetween } from "./dignities";

describe("dignityBetween (Golden Dawn)", () => {
  it.each([
    ["fuego", "fuego", "intensifica"],
    ["agua", "agua", "intensifica"],
    ["fuego", "aire", "refuerza"],
    ["aire", "fuego", "refuerza"],
    ["agua", "tierra", "refuerza"],
    ["tierra", "agua", "refuerza"],
    ["fuego", "agua", "debilita"],
    ["agua", "fuego", "debilita"],
    ["aire", "tierra", "debilita"],
    ["tierra", "aire", "debilita"],
    ["fuego", "tierra", "neutral"],
    ["aire", "agua", "neutral"],
  ] as const)("%s + %s = %s", (a, b, expected) => {
    expect(dignityBetween(a, b)).toBe(expected);
  });
});
