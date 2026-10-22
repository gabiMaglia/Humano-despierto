import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { auditRateLimitCoverage, type SourceFile } from "./coverage";
import { RATE_LIMITS, RATE_LIMIT_EXEMPT } from "./limits";

const SRC = fileURLToPath(new URL("../..", import.meta.url));
const APP = join(SRC, "app");

function sources(): SourceFile[] {
  return readdirSync(SRC, { recursive: true, encoding: "utf8" })
    .filter((p) => /\.(ts|tsx)$/.test(p) && !/\.test\.tsx?$/.test(p))
    .map((p) => ({ path: relative(APP, join(SRC, p)).split("\\").join("/"), source: readFileSync(join(SRC, p), "utf8") }));
}

const USE_SERVER = '"use server";\n';
const LIMITS = { fooAction: { max: 1, windowSeconds: 1 }, recursoGet: { max: 1, windowSeconds: 1 } };

describe("meta: cada regla del guard falla sola (playbook: un verificador se prueba rompiéndolo)", () => {
  const ok: SourceFile[] = [
    { path: "x/actions.ts", source: `${USE_SERVER}export const fooAction = withRateLimit(\n  "fooAction",\n  async () => 1,\n);` },
    { path: "x/route.ts", source: `export const GET = withRateLimit("recursoGet", async () => new Response());` },
  ];

  it("el árbol correcto no da hallazgos", () => {
    expect(auditRateLimitCoverage(ok, LIMITS, {})).toEqual([]);
  });

  it.each([
    ["action sin wrapper", [{ path: "x/actions.ts", source: `${USE_SERVER}export async function fooAction() {}` }, ok[1]], {}, /sin withRateLimit/],
    ["const sin wrapper en use server", [{ path: "x/actions.ts", source: `${USE_SERVER}export const fooAction = async () => 1;` }, ok[1]], {}, /sin withRateLimit/],
    ["nombre del wrapper distinto del export", [{ path: "x/actions.ts", source: `${USE_SERVER}export const fooAction = withRateLimit("recursoGet", async () => 1);` }, ok[1]], {}, /nombre/],
    ["wrapper sin límite en la tabla", [...ok, { path: "y/actions.ts", source: `${USE_SERVER}export const barAction = withRateLimit("barAction", async () => 1);` }], {}, /RATE_LIMITS/],
    ["límite sin action", [ok[1]], {}, /sin action/],
    ["handler sin wrapper ni exención", [ok[0], { path: "x/route.ts", source: `export async function GET() { return new Response(); }` }], {}, /sin withRateLimit/],
    ["exención que ya no existe", ok, { viejaAction: "motivo" }, /exención sin export/],
    ["export default en use server", [...ok, { path: "y/actions.ts", source: `${USE_SERVER}export default async function x() {}` }], {}, /forma de export/],
    ["re-export en use server", [...ok, { path: "y/actions.ts", source: `${USE_SERVER}export { fooAction as barAction } from "./x";` }], {}, /forma de export/],
    ["mismo límite usado dos veces", [...ok, { path: "z/route.ts", source: `export const POST = withRateLimit("recursoGet", async () => new Response());` }], {}, /dos veces/],
  ])("%s", (_name, files, exempt, problem) => {
    const issues = auditRateLimitCoverage(files as SourceFile[], LIMITS, exempt);
    expect(issues.map((i) => i.problem).join(" | ")).toMatch(problem);
  });

  it("una exención con motivo deja pasar el export", () => {
    const files = [...ok, { path: "x/actions.ts", source: `${USE_SERVER}export async function lecturaAction() {}` }];
    expect(auditRateLimitCoverage(files, LIMITS, { lecturaAction: "solo lee" })).toEqual([]);
  });

  it("ignora archivos que no son use server ni route.ts", () => {
    const files = [...ok, { path: "../lib/x.ts", source: `export async function cualquiera() {}` }];
    expect(auditRateLimitCoverage(files, LIMITS, {})).toEqual([]);
  });
});

describe("el código real", () => {
  it("toda Server Action y todo Route Handler tiene límite o exención con motivo", () => {
    const files = sources();
    // Cero archivos revisados no es "todo bien" (playbook): es buscar en el lugar equivocado.
    expect(files.filter((f) => /^["']use server["']/.test(f.source.trimStart())).length).toBeGreaterThanOrEqual(14);
    expect(files.filter((f) => f.path.endsWith("/route.ts")).length).toBeGreaterThanOrEqual(4);
    const issues = auditRateLimitCoverage(files, RATE_LIMITS, RATE_LIMIT_EXEMPT);
    expect(issues, issues.map((i) => `${i.path} ${i.name}: ${i.problem}`).join("\n")).toEqual([]);
  });
});
