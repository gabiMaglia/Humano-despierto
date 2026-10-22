import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// T-051: la unica salida permitida es log.ts. Un console.* nuevo en src rompe este test.
const SRC = join(process.cwd(), "src");
const ALLOWED = new Set(["lib/server/log.ts"]);

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
}

function findConsoleCalls(files: { path: string; text: string }[]) {
  return files
    .filter((f) => !ALLOWED.has(f.path))
    .filter((f) => /\.(ts|tsx)$/.test(f.path) && !/\.test\.tsx?$/.test(f.path))
    .filter((f) => /\bconsole\s*\./.test(f.text))
    .map((f) => f.path);
}

describe("sin console.* en src", () => {
  it("el detector muerde: marca un archivo con console y respeta log.ts y los tests", () => {
    expect(findConsoleCalls([{ path: "app/x.ts", text: "console.error('x')" }])).toEqual(["app/x.ts"]);
    expect(findConsoleCalls([{ path: "lib/server/log.ts", text: "console.error('x')" }])).toEqual([]);
    expect(findConsoleCalls([{ path: "app/x.test.ts", text: "console.error('x')" }])).toEqual([]);
  });

  it("src no contiene console.* fuera de log.ts y de los tests", () => {
    const files = walk(SRC).map((p) => ({ path: relative(SRC, p), text: readFileSync(p, "utf8") }));
    expect(findConsoleCalls(files)).toEqual([]);
  });
});
