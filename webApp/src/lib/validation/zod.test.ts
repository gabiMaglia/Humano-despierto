import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "./zod";

const SRC = join(__dirname, "../..");
const WRAPPER = "lib/validation/zod.ts";

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sources(full);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [full] : [];
  });
}

describe("zod sin JIT (T-052)", () => {
  it("el wrapper deja zod en jitless: la sonda `new Function` no corre bajo la CSP", () => {
    expect(z.config().jitless).toBe(true);
  });

  // Un archivo "use server" nunca llega al navegador, donde vive la CSP. Se exime para no tocar
  // Server Actions de otros tickets; un schema que el cliente comparta tiene que vivir en lib/.
  it("guard: ningun modulo que pueda llegar al navegador importa `zod` directo (saltearia el jitless)", () => {
    const culpables = sources(SRC)
      .filter((f) => relative(SRC, f) !== WRAPPER)
      .filter((f) => !/^\s*["']use server["']/.test(readFileSync(f, "utf8")))
      .filter((f) => /from\s+["']zod(\/[^"']*)?["']|require\(\s*["']zod["']\s*\)/.test(readFileSync(f, "utf8")))
      .map((f) => relative(SRC, f));
    expect(culpables).toEqual([]);
  });
});
