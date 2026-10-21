import { expect, test, type Page } from "@playwright/test";
import { ALUMNA, assertStackUp } from "./fixtures";
import { authLinkFor, messagesTo, welcomeCount } from "./mailpit";

const SESSION_COOKIE = /^sb-.+-auth-token(\.\d+)?$/;
const PASSWORD = "clave-e2e-1";
// Fixtures del seed (T-038) con rol distinto de student; misma clave que ALUMNA.
const ADMIN = { email: "admin@test.local", password: "test-1234" };
const DOCENTE = { email: "docente@test.local", password: "test-1234" };

function freshEmail(tag: string): string {
  return `e2e-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
}

async function hasSession(page: Page): Promise<boolean> {
  return (await page.context().cookies()).some((c) => SESSION_COOKIE.test(c.name));
}

// networkidle espera la hidratación: sin ella el submit es un envío nativo y no el de Supabase.
async function register(page: Page, email: string, name = "Alumna de Prueba"): Promise<void> {
  await page.goto("/entrar", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Crear cuenta" }).first().click();
  await page.getByLabel("Nombre").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.locator('form button[type="submit"]').click();
}

async function loginAt(page: Page, path: string, email: string, password: string): Promise<void> {
  await page.goto(path, { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.locator('form button[type="submit"]').click();
}

async function registerAndConfirm(page: Page, email: string): Promise<void> {
  await register(page, email);
  await expect(page.getByRole("status")).toBeVisible();
  await page.goto(await authLinkFor(page.request, email, "signup"));
  await expect(page).toHaveURL(/\/panel$/);
}

test.beforeEach(async ({ page }) => {
  await assertStackUp(page.request);
});

test("c.1 c.2 registro sin sesión, link de confirmación, /panel y una sola bienvenida", async ({ page }) => {
  const email = freshEmail("registro");
  await register(page, email);

  await expect(page.getByRole("status")).toContainText(/revisá tu mail/i);
  expect(await hasSession(page)).toBe(false);

  const link = await authLinkFor(page.request, email, "signup");
  expect(new URL(link).searchParams.get("redirect_to")).toMatch(/\/auth\/callback\?next=/);

  await page.goto(link);
  await expect(page).toHaveURL(/\/panel$/);
  expect(await hasSession(page)).toBe(true);
  await expect.poll(() => welcomeCount(page.request, email), { timeout: 20_000 }).toBe(1);

  // Segunda apertura: el token ya se usó, no nace sesión nueva y no hay a quién mandarle otra bienvenida.
  await page.goto(link);
  await expect(page).toHaveURL(/\/entrar\?error=link/);
  expect(await welcomeCount(page.request, email)).toBe(1);
});

test("c.3 ?next= interno se respeta y los externos caen en /panel", async ({ page }) => {
  const cases: [string, RegExp][] = [
    ["/leccion/abc", /\/leccion\/abc$/],
    ["https://evil.tld", /\/panel$/],
    ["//evil.tld", /\/panel$/],
    ["/\\evil.tld", /\/panel$/],
  ];
  for (const [next, expected] of cases) {
    await page.context().clearCookies();
    await loginAt(page, `/entrar?next=${encodeURIComponent(next)}`, ALUMNA.email, ALUMNA.password);
    await expect(page).toHaveURL(expected);
    expect(new URL(page.url()).hostname).toMatch(/^(localhost|127\.0\.0\.1)$/);
  }
});

test("c.4 sin confirmar no entra y se le pide confirmar", async ({ page }) => {
  const email = freshEmail("sin-confirmar");
  await register(page, email);
  await expect(page.getByRole("status")).toBeVisible();

  await loginAt(page, "/entrar", email, PASSWORD);
  await expect(page.getByRole("alert")).toHaveText("Confirmá tu mail para entrar.");
  await expect(page).toHaveURL(/\/entrar/);
  expect(await hasSession(page)).toBe(false);
});

test("c.5 recuperar responde lo mismo exista o no la cuenta", async ({ page }) => {
  async function ask(email: string): Promise<string> {
    await page.goto("/entrar/recuperar", { waitUntil: "networkidle" });
    await page.getByLabel("Email").fill(email);
    await page.locator('form button[type="submit"]').click();
    const status = page.getByRole("status");
    await expect(status).toBeVisible();
    return (await status.innerText()).trim();
  }
  const existe = await ask(ALUMNA.email);
  const noExiste = await ask(freshEmail("nadie"));
  expect(noExiste).toBe(existe);
  expect(existe).toMatch(/^Si existe una cuenta/);
});

test("c.6 link de recuperación, clave nueva, login con ella; el link usado da el error neutro", async ({ page }) => {
  const email = freshEmail("recupera");
  await registerAndConfirm(page, email);
  await page.context().clearCookies();

  await page.goto("/entrar/recuperar", { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(email);
  await page.locator('form button[type="submit"]').click();
  await expect(page.getByRole("status")).toBeVisible();

  const link = await authLinkFor(page.request, email, "recovery");
  await page.goto(link);
  await expect(page).toHaveURL(/\/entrar\/nueva-clave$/);

  const nueva = "clave-e2e-nueva-2";
  await page.getByLabel("Clave nueva").fill(nueva);
  await page.getByLabel("Repetí la clave").fill(nueva);
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/\/panel$/);

  await page.context().clearCookies();
  await loginAt(page, "/entrar", email, nueva);
  await expect(page).toHaveURL(/\/panel$/);

  await page.goto(link);
  await expect(page).toHaveURL(/\/entrar\?error=link/);
  await expect(page.getByRole("alert")).toContainText("venció o ya se usó");
  // La recuperación no es un alta: sigue habiendo una sola bienvenida.
  expect(await welcomeCount(page.request, email)).toBe(1);
});

test("c.7 callback sin code o con code inválido redirige al error neutro", async ({ page }) => {
  for (const path of ["/auth/callback", "/auth/callback?code=no-existe"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/entrar\?error=link$/);
    await expect(page.getByRole("alert")).toContainText("venció o ya se usó");
    await expect(page.getByRole("alert")).not.toContainText(/code|pkce|token/i);
  }
});

test("c.8 un nombre con link se frena antes de signUp", async ({ page }) => {
  const email = freshEmail("nombre-link");
  await register(page, email, "visitá https://ejemplo.com");
  await expect(page.getByRole("alert")).toContainText("no puede contener un link");
  await expect(page.getByRole("status")).toHaveCount(0);
  expect(await messagesTo(page.request, email)).toHaveLength(0);
});

test("c.9 sin ?next= cada rol cae en su panel; con next válido gana next", async ({ page }) => {
  const cases: [{ email: string; password: string }, string, RegExp][] = [
    [ADMIN, "/entrar", /\/panel\/admin$/],
    [DOCENTE, "/entrar", /\/panel\/docente$/],
    [ALUMNA, "/entrar", /\/panel$/],
    [ADMIN, `/entrar?next=${encodeURIComponent("/cursos")}`, /\/cursos$/],
    // next inválido cuenta como ausente: vuelve al panel del rol, nunca a otro host.
    [DOCENTE, `/entrar?next=${encodeURIComponent("//evil.tld")}`, /\/panel\/docente$/],
  ];
  for (const [user, path, expected] of cases) {
    await page.context().clearCookies();
    await loginAt(page, path, user.email, user.password);
    await expect(page).toHaveURL(expected);
  }
});

test("nueva clave sin sesión manda a recuperar", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/entrar/nueva-clave");
  await expect(page).toHaveURL(/\/entrar\/recuperar$/);
});
