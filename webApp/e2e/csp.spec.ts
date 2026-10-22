import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import { expect, test, ALUMNA, login } from "./fixtures";

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

// ---------------------------------------------------------------- guard de violaciones (c.2)
test("guard: ningun spec importa `test` de @playwright/test (saltearia cspGuard)", () => {
  const dir = __dirname;
  const culpables = readdirSync(dir)
    .filter((f) => f.endsWith(".spec.ts"))
    .filter((f) =>
      /import\s*\{[^}]*\btest\b[^}]*\}\s*from\s*["']@playwright\/test["']/.test(readFileSync(join(dir, f), "utf8")),
    );
  expect(culpables).toEqual([]);
});

// Inyecta un <script> inline SIN nonce en el HTML real de /cursos: en Report-Only corre, pero
// el navegador emite la violacion. Los dos tests de abajo pasan solo si el guard los hace fallar.
async function injectInline(target: Page): Promise<void> {
  await target.route("**/cursos", async (route) => {
    const res = await route.fetch();
    const html = (await res.text()).replace("</body>", "<script>window.__x=1</script></body>");
    await route.fulfill({ response: res, body: html });
  });
  await target.goto("/cursos");
  await expect.poll(() => target.evaluate(() => (window as unknown as { __x?: number }).__x)).toBe(1);
}

test("guard muerde: una violacion en `page` hace fallar el test", async ({ page }) => {
  test.fail();
  await injectInline(page);
});

// ---------------------------------------------------------------- c.3 · enforce
// Sin segundo servidor: se toma la respuesta REAL de /cursos y se le cambia solo el nombre de la
// cabecera (lo mismo que hace CSP_ENFORCE=true, probado en csp.test.ts). Se ejercita la politica
// tal cual la emite el servidor.
async function cursosWithInjected(page: Page, enforce: boolean): Promise<number | undefined> {
  await page.route("**/cursos", async (route) => {
    const res = await route.fetch();
    const headers = { ...res.headers() };
    const value = headers["content-security-policy-report-only"];
    expect(value, "el servidor no emitio la politica").toBeTruthy();
    if (enforce) {
      delete headers["content-security-policy-report-only"];
      headers["content-security-policy"] = value;
    }
    const html = (await res.text()).replace("</body>", "<script>window.__inyectado=1</script></body>");
    await route.fulfill({ response: res, headers, body: html });
  });
  await page.goto("/cursos");
  // Y la pagina sigue viva: los scripts de Next (con nonce) si corrieron y la hidratacion pinta.
  await expect(page.locator("h1").first()).toBeVisible();
  return page.evaluate(() => (window as unknown as { __inyectado?: number }).__inyectado);
}

test("c.3 · con la politica en enforce, un <script> inline sin nonce no ejecuta", async ({ page, allowCsp }) => {
  allowCsp.allowed = true; // este test provoca la violacion a proposito
  expect(await cursosWithInjected(page, true)).toBeUndefined();
});

test("c.3 · control: la misma inyeccion en Report-Only SI ejecuta (el test ve la diferencia)", async ({
  page,
  allowCsp,
}) => {
  allowCsp.allowed = true;
  expect(await cursosWithInjected(page, false)).toBe(1);
});

test("guard muerde: tambien en una pagina abierta con browser.newPage()", async ({ browser }) => {
  test.fail();
  const other = await browser.newPage();
  await injectInline(other);
  await other.close();
});

// ---------------------------------------------------------------- c.5 · 404 propia · c.7 · embebido
test("c.5 · ruta inexistente: 404 real, pagina propia, noindex", async ({ page }) => {
  const res = await page.goto("/ruta-que-no-existe-t052");
  expect(res?.status()).toBe(404);
  await expect(page.getByText("Este camino no existe")).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.getByRole("link", { name: /cursos/i })).toHaveAttribute("href", "/cursos");
});

test("c.5 · un curso inexistente cae en la misma 404 con status 404", async ({ page }) => {
  const res = await page.goto("/cursos/no-existe-t052");
  expect(res?.status()).toBe(404);
  await expect(page.getByText("Este camino no existe")).toBeVisible();
});

// Por cabecera: un iframe cross-origin exige un segundo origen servido, y en Report-Only
// frame-ancestors solo reporta; el bloqueo efectivo hoy lo hace X-Frame-Options.
test("c.7 · /certificado no se deja embeber desde otro origen", async ({ request }) => {
  const res = await request.get("/certificado/codigo-inexistente-t052");
  const policy = Object.entries(res.headers()).find(([h]) => /^content-security-policy/.test(h))?.[1] ?? "";
  expect(policy).toContain("frame-ancestors 'self'");
  expect(res.headers()["x-frame-options"]).toBe("SAMEORIGIN");
});
