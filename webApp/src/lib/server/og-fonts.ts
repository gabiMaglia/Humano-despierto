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

// Una lectura por proceso: la fuente no cambia y cada imagen OG la necesita.
export function loadOgFonts(): Promise<OgFont[]> {
  cache ??= Promise.all([load("Cinzel-Regular.ttf"), load("Cinzel-Bold.ttf")]).then(([regular, bold]) => [
    { name: "Cinzel", data: regular, weight: 400, style: "normal" },
    { name: "Cinzel", data: bold, weight: 700, style: "normal" },
  ]);
  return cache;
}
