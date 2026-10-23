/**
 * Guard de T-050: toda Server Action (export de un archivo `"use server"`) y todo método de un
 * `route.ts` pasa por `withRateLimit` con su propio nombre, o figura en `RATE_LIMIT_EXEMPT` con un
 * motivo. Lee el texto fuente, no el AST: cubre las dos formas que usa el repo
 * (`export async function` y `export const X = withRateLimit("X", ...)`). `export default`,
 * `export { … }` y `export *` no los puede atribuir a un límite, así que en esos archivos son un
 * hallazgo y no un punto ciego. Otra forma que aparezca (p. ej. `export let`) no la ve: se amplía acá.
 */

export interface SourceFile {
  /** Relativa a `src/app`, con `/`. */
  path: string;
  source: string;
}

export interface CoverageIssue {
  path: string;
  name: string;
  problem: string;
}

const USE_SERVER = /^["']use server["']/;
// Lo que puede preceder a la directiva sin anularla: espacios, comentarios de línea y de bloque.
const LEADING_TRIVIA = /^(?:\s+|\/\/[^\n]*|\/\*[\s\S]*?\*\/)*/;

/** `"use server"` como directiva: primera sentencia del archivo, aunque la precedan comentarios
 * (Next la acepta ahí). Una cabecera comentada no puede sacar al archivo del guard. */
export function hasUseServerDirective(source: string): boolean {
  return USE_SERVER.test(source.replace(LEADING_TRIVIA, ""));
}
const METHODS = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);
const UNAUDITED_EXPORT = /^export\s+(?:default\b|\{|\*)/m;
const EXPORT = /^export\s+(?:async\s+function\s*\*?\s*(\w+)|function\s+(\w+)|const\s+(\w+)\s*=\s*(withRateLimit\(\s*["'](\w+)["'])?)/gm;

export function auditRateLimitCoverage(
  files: SourceFile[],
  limits: Record<string, unknown>,
  exempt: Readonly<Record<string, string>>,
): CoverageIssue[] {
  const issues: CoverageIssue[] = [];
  const usedLimits = new Map<string, string>();
  const usedExempt = new Set<string>();

  for (const file of files) {
    const isServer = hasUseServerDirective(file.source);
    // Un handler se reconoce por el nombre del archivo, no por su contenido: los comentarios de
    // cabecera no lo pueden esconder.
    const isRoute = /(^|\/)route\.ts$/.test(file.path);
    if (!isServer && !isRoute) continue;
    if (UNAUDITED_EXPORT.test(file.source)) {
      issues.push({ path: file.path, name: "*", problem: "forma de export que el guard no audita (default, { } o *)" });
    }

    for (const m of file.source.matchAll(EXPORT)) {
      const name = m[1] ?? m[2] ?? m[3];
      if (!name) continue;
      if (isRoute && !METHODS.has(name)) continue;
      const exemptKey = isRoute ? `${file.path}#${name}` : name;
      const wrappedAs = m[5];

      if (!wrappedAs) {
        if (exempt[exemptKey]) {
          usedExempt.add(exemptKey);
          continue;
        }
        issues.push({ path: file.path, name, problem: "sin withRateLimit ni exención en RATE_LIMIT_EXEMPT" });
        continue;
      }
      if (!isRoute && wrappedAs !== name) {
        issues.push({ path: file.path, name, problem: `el nombre del wrapper ("${wrappedAs}") no es el del export` });
      }
      if (!(wrappedAs in limits)) {
        issues.push({ path: file.path, name, problem: `"${wrappedAs}" no está en RATE_LIMITS` });
      }
      const previous = usedLimits.get(wrappedAs);
      if (previous) {
        issues.push({ path: file.path, name, problem: `el límite "${wrappedAs}" se usa dos veces (también en ${previous})` });
      }
      usedLimits.set(wrappedAs, `${file.path}#${name}`);
    }
  }

  for (const name of Object.keys(limits)) {
    if (!usedLimits.has(name)) issues.push({ path: "lib/rate-limit/limits.ts", name, problem: "límite sin action que lo use" });
  }
  for (const key of Object.keys(exempt)) {
    if (!usedExempt.has(key)) issues.push({ path: "lib/rate-limit/limits.ts", name: key, problem: "exención sin export" });
  }
  return issues;
}
