import { expect, test } from "@playwright/test";
import { ALUMNA, login } from "./fixtures";

const CSP_HEADER = /^content-security-policy(-report-only)?$/;

function nonceOf(headers: Record<string, string>): string {
  const name = Object.keys(headers).find((h) => CSP_HEADER.test(h));
  expect(name, "la respuesta no trae cabecera CSP").toBeTruthy();
  const m = headers[name!].match(/'nonce-([A-Za-z0-9+/=]+)'/);
  expect(m, "la CSP no trae nonce").toBeTruthy();
  return m![1];
}

// Next pone el nonce en el HTML servido; el navegador lo oculta del DOM (getAttribute devuelve ""),
// por eso se mira el cuerpo crudo de la respuesta y no la pagina.
function scriptNonces(html: string): string[] {
  return [...html.matchAll(/<script\b[^>]*>/g)].map((m) => m[0].match(/\snonce="([^"]*)"/)?.[1] ?? "<sin nonce>");
}

for (const path of ["/", "/cursos", "/cursos/tarot-iniciatico", "/guias", "/diario", "/entrar"]) {
  test(`c.1 · ${path}: CSP Report-Only con nonce y todos los <script> lo llevan`, async ({ request }) => {
    const res = await request.get(path);
    expect(res.status()).toBe(200);
    const headers = res.headers();
    expect(headers["content-security-policy-report-only"]).toBeTruthy();
    const nonce = nonceOf(headers);
    const nonces = scriptNonces(await res.text());
    expect(nonces.length).toBeGreaterThan(0);
    expect(new Set(nonces)).toEqual(new Set([nonce]));
  });
}

test("c.1 · el nonce cambia en cada request", async ({ request }) => {
  const a = nonceOf((await request.get("/cursos")).headers());
  const b = nonceOf((await request.get("/cursos")).headers());
  expect(a).not.toBe(b);
});

test("c.1 · una ruta protegida (proxy con updateSession) tambien sale con nonce", async ({ page }) => {
  await login(page, ALUMNA);
  const res = await page.request.get("/panel");
  expect(res.status()).toBe(200);
  const nonce = nonceOf(res.headers());
  expect(new Set(scriptNonces(await res.text()))).toEqual(new Set([nonce]));
});
