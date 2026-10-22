import type { APIRequestContext } from "@playwright/test";
import { expect, test } from "./fixtures";

// Bajo un segmento dinamico Next sirve la imagen en `opengraph-image-<hash>` (sufijo estable por
// ruta), no en `opengraph-image`: pedir el path pelado da 404 por falta de ruta, no por el curso.
// Por eso la URL se toma de la meta de la ficha, que es lo que lee WhatsApp.
async function ogImagePath(request: APIRequestContext, page: string): Promise<string> {
  const html = await (await request.get(page)).text();
  const content = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
  expect(content, `${page} no declara og:image`).toBeTruthy();
  const url = new URL(content!.replace(/&amp;/g, "&"));
  return url.pathname + url.search;
}

function expectPng1200x630(b: Buffer) {
  expect([...b.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  expect([b.readUInt32BE(16), b.readUInt32BE(20)]).toEqual([1200, 630]);
}

test("c.4 · /opengraph-image: 200 image/png 1200x630", async ({ request }) => {
  const res = await request.get("/opengraph-image");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("image/png");
  expectPng1200x630(await res.body());
});

test("c.4 · la ficha declara og:image apuntando a su propia imagen", async ({ request }) => {
  expect(await ogImagePath(request, "/cursos/tarot-iniciatico")).toMatch(
    /^\/cursos\/tarot-iniciatico\/opengraph-image(-[a-z0-9]+)?(\?|$)/,
  );
});

test("c.4 · curso publicado: la URL de su og:image da 200 image/png 1200x630", async ({ request }) => {
  const res = await request.get(await ogImagePath(request, "/cursos/tarot-iniciatico"));
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("image/png");
  expect(res.headers()["cache-control"]).toMatch(/max-age=3600/);
  expectPng1200x630(await res.body());
});

test("c.4 · slug inexistente en la MISMA ruta de imagen: 404, no una imagen vacia", async ({ request }) => {
  const real = await ogImagePath(request, "/cursos/tarot-iniciatico");
  const res = await request.get(real.replace("/tarot-iniciatico/", "/no-existe-este-curso-t052/"));
  expect(res.status()).toBe(404);
  expect(res.headers()["content-type"] ?? "").not.toContain("image/png");
});
