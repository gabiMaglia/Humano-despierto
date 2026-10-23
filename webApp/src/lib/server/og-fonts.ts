import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

type OgFont = { name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" };

let cache: Promise<OgFont[]> | null = null;

async function load(file: string): Promise<ArrayBuffer> {
  // process.cwd() es webApp en `next dev`/`next start`. Con `output: "standalone"` (hoy no se
  // usa) habria que sumar estos archivos a outputFileTracingIncludes.
  const buf = await readFile(join(process.cwd(), "src/assets/fonts", file));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

export const OG_FONT_FAMILY = "Plus Jakarta Sans";

// Una lectura por proceso: la fuente no cambia y cada imagen OG la necesita. TTF estáticas por
// peso (satori no lee WOFF2 ni elige instancias de una variable), OFL en OFL-PlusJakartaSans.txt.
export function loadOgFonts(): Promise<OgFont[]> {
  cache ??= Promise.all([load("PlusJakartaSans-Regular.ttf"), load("PlusJakartaSans-Bold.ttf")]).then(([regular, bold]) => [
    { name: OG_FONT_FAMILY, data: regular, weight: 400, style: "normal" },
    { name: OG_FONT_FAMILY, data: bold, weight: 700, style: "normal" },
  ]);
  return cache;
}
