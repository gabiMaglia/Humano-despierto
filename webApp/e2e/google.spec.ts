import { expect, test, type Page } from "@playwright/test";

const SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const AUTHORIZE = `${SUPABASE}/auth/v1/authorize`;
const SESSION_COOKIE = /^sb-.+-auth-token(\.\d+)?$/;
const VERIFIER_COOKIE = /code-verifier(\.\d+)?$/;
const GOTRUE_CALLBACK = "http://127.0.0.1:54321/auth/v1/callback";

interface Captured {
  origin: string;
  authorize: URL;
}

// Se intercepta la salida a GoTrue: lo que se prueba es lo que arma el navegador (provider, PKCE,
// redirect_to). Eso no depende de tener credenciales de Google, así que corre en cualquier máquina.
async function clickGoogle(page: Page, entrarPath: string): Promise<Captured> {
  let authorize = null as string | null;
  await page.route(`${AUTHORIZE}**`, async (route) => {
    authorize = route.request().url();
    await route.fulfill({ status: 200, contentType: "text/html", body: "<p>authorize interceptado</p>" });
  });
  await page.goto(entrarPath, { waitUntil: "networkidle" });
  const origin = new URL(page.url()).origin;
  const button = page.getByRole("button", { name: "Continuar con Google" });
  await expect(button).toBeEnabled();
  await button.click();
  await expect.poll(() => authorize, { message: "el botón no navegó a /auth/v1/authorize" }).not.toBeNull();
  return { origin, authorize: new URL(authorize!) };
}

test("c.3 c.5 sale a GoTrue con provider google, PKCE y vuelta al callback con el next interno", async ({ page }) => {
  const { origin, authorize } = await clickGoogle(page, "/entrar?next=%2Fcursos%2Ftarot-iniciatico");

  expect(`${authorize.origin}${authorize.pathname}`).toBe(AUTHORIZE);
  expect(authorize.searchParams.get("provider")).toBe("google");
  expect(authorize.searchParams.get("redirect_to")).toBe(`${origin}/auth/callback?next=%2Fcursos%2Ftarot-iniciatico`);
  expect(authorize.searchParams.get("code_challenge")?.length ?? 0).toBeGreaterThanOrEqual(43);
  expect(authorize.searchParams.get("code_challenge_method")).toMatch(/^s256$/i);
  // Sin el verificador en cookie, el Route Handler de /auth/callback no puede canjear el code.
  expect((await page.context().cookies()).some((c) => VERIFIER_COOKIE.test(c.name))).toBe(true);
});

test("c.3 un next externo vuelve como /panel", async ({ page }) => {
  const { origin, authorize } = await clickGoogle(page, "/entrar?next=https%3A%2F%2Fevil.tld");
  expect(authorize.searchParams.get("redirect_to")).toBe(`${origin}/auth/callback?next=%2Fpanel`);
});

test("c.4 cancelar en Google vuelve al error neutro de T-040 y sin sesión", async ({ page }) => {
  const { authorize } = await clickGoogle(page, "/entrar?next=%2Fpanel");
  await page.unroute(`${AUTHORIZE}**`);

  // Lo que GoTrue hace cuando Google devuelve access_denied: redirige al redirect_to del flujo con
  // el error en la query (PKCE). Task 7 confirma la URL real con credenciales.
  const back = new URL(authorize.searchParams.get("redirect_to")!);
  back.searchParams.set("error", "access_denied");
  back.searchParams.set("error_description", "The user denied the request");
  await page.goto(back.toString());

  await expect(page).toHaveURL(/\/entrar\?error=link$/);
  await expect(page.getByText("El enlace venció o ya se usó")).toBeVisible();
  expect((await page.context().cookies()).some((c) => SESSION_COOKIE.test(c.name))).toBe(false);
});

test("Google real: GoTrue sale a accounts.google.com con el client_id del PO", async ({ request }) => {
  const res = await request.get(AUTHORIZE, {
    params: { provider: "google", redirect_to: "http://localhost:3000/auth/callback?next=%2Fpanel" },
    maxRedirects: 0,
  });
  const location = res.headers()["location"] ?? "";
  const clientId = location.startsWith("https://accounts.google.com/")
    ? new URL(location).searchParams.get("client_id") ?? ""
    : "";
  test.skip(
    clientId === "" || clientId.startsWith("env("),
    "Sin credenciales de Google en el stack local (SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID vacía): " +
      "c.1 a c.4 contra Google real NO VERIFICABLES en esta corrida; se verifican a mano (T-041 Task 7).",
  );

  expect(clientId).toMatch(/\.apps\.googleusercontent\.com$/);
  expect(new URL(location).searchParams.get("redirect_uri")).toBe(GOTRUE_CALLBACK);
});
