import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// T-091 (QA r1) · guard de clase: el build no puede consultar la base. Una página bajo el root
// layout se renderiza en paralelo al connection() del layout, así que sus consultas salían igual
// durante el prerender (/, /diario, /guias). `dynamic = "force-dynamic"` en el root layout saca
// del prerender a todo el árbol, incluidas las páginas que se agreguen mañana; este test impide
// que alguien lo quite o lo pise en un segmento.

const APP = join(__dirname);
const read = (f: string) => readFileSync(join(APP, f), "utf8");

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

const SOURCES = walk(APP)
  .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f))
  .map((f) => relative(APP, f));

// Los metadata routes de la raíz (sitemap, robots, opengraph-image, icon) no cuelgan del layout.
const ROOT_METADATA = /^(sitemap|robots|manifest|opengraph-image|twitter-image|icon|apple-icon)\.(ts|tsx)$/;
// Lo que no toca la base: el host configurado y las fuentes vendorizadas del OG.
const NO_DB = new Set(["@/lib/server/site-url", "@/lib/server/og-fonts", "@/lib/server/log"]);

describe("T-091 · el build no consulta Supabase", () => {
  it("el root layout fuerza render por request para todo el árbol", () => {
    expect(read("layout.tsx")).toMatch(/^export const dynamic = "force-dynamic";?$/m);
  });

  it("ningún segmento pisa esa decisión (dynamic, revalidate o fetchCache)", () => {
    const offenders = SOURCES.filter(
      (f) => f !== "layout.tsx" && /^export const (dynamic|revalidate|fetchCache)\b/m.test(read(f)),
    );
    expect(offenders).toEqual([]);
  });

  it("un metadata route de la raíz que lee lib/server espera un request antes", () => {
    const offenders = SOURCES.filter((f) => ROOT_METADATA.test(f)).filter((f) => {
      const src = read(f);
      const server = [...src.matchAll(/from "(@\/lib\/server\/[^"]+)"/g)].map((m) => m[1]);
      return server.some((m) => !NO_DB.has(m)) && !/await connection\(\)/.test(src);
    });
    expect(offenders).toEqual([]);
  });
});
