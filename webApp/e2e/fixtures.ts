import {
  test as base,
  expect,
  type APIRequestContext,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";

// ---------------------------------------------------------------- T-052 · guard de CSP
// El segundo parametro de cada fixture se llama `provide` y no `use`: con `use` la regla de hooks
// de React lo toma por el hook de React 19 y falla el lint.
// Todo spec importa `test` de aca (csp.spec.ts lo verifica). Cualquier violacion de CSP,
// Report-Only incluida, en cualquier documento que abra el test es un test en rojo: ese verde
// es el criterio para pasar a enforce.
type Violation = { directive: string; blocked: string; doc: string };

export const test = base.extend<{ cspGuard: void; allowCsp: { allowed: boolean } }>({
  allowCsp: async ({}, provide) => {
    await provide({ allowed: false });
  },
  cspGuard: [
    async ({ context, browser, allowCsp }, provide, testInfo) => {
      const seen: Violation[] = [];
      const arm = async (ctx: BrowserContext) => {
        // A nivel contexto: cubre toda pagina y toda navegacion, tambien las ya abiertas.
        await ctx.exposeBinding("__reportCsp", (_source, v: Violation) => void seen.push(v));
        await ctx.addInitScript(() => {
          document.addEventListener("securitypolicyviolation", (e) => {
            (window as unknown as { __reportCsp: (v: unknown) => void }).__reportCsp({
              directive: e.effectiveDirective,
              blocked: e.blockedURI,
              doc: e.documentURI,
            });
          });
        });
        // Segunda red: Chrome escribe cada violacion (tambien las Report-Only) en la consola.
        ctx.on("console", (m) => {
          if (/Content Security Policy/i.test(m.text())) seen.push({ directive: "console", blocked: m.text(), doc: m.page()?.url() ?? "" });
        });
      };
      await arm(context);
      // Specs que abren su propio contexto (browser.newPage/newContext) tambien quedan cubiertos.
      // newPage pasa por newContext. workers=1 y se restaura al terminar el test.
      const originalNewContext = browser.newContext.bind(browser);
      browser.newContext = async (...args: Parameters<Browser["newContext"]>) => {
        const ctx = await originalNewContext(...args);
        await arm(ctx);
        return ctx;
      };
      try {
        await provide();
      } finally {
        browser.newContext = originalNewContext;
      }
      if (!allowCsp.allowed && seen.length) {
        testInfo.annotations.push({ type: "csp", description: JSON.stringify(seen) });
        throw new Error(`Violaciones de CSP: ${JSON.stringify(seen, null, 2)}`);
      }
    },
    { auto: true },
  ],
});
export { expect };

export interface SeedUser {
  email: string;
  password: string;
  enrolledSlug: string;
}

export const ALUMNA: SeedUser = { email: "alumna@test.local", password: "test-1234", enrolledSlug: "tarot-iniciatico" };
// T-037 · la guia duena de tarot-iniciatico y el admin del seed (T-043 ya lo usaba en su spec).
export const SOL: SeedUser = {
  email: "sol.mayor@seed.humano.local",
  password: "seed-teacher-1234",
  enrolledSlug: "tarot-iniciatico",
};
export const ADMIN: Pick<SeedUser, "email" | "password"> = { email: "admin@test.local", password: "test-1234" };
export const DELFINA: SeedUser = {
  email: "delfina.curso-completo@seed.humano.local",
  password: "seed-student-1234",
  enrolledSlug: "reiki-nivel-1",
};

// Playwright no habla con Postgres: la precondicion "hay stack" se prueba pidiendo el health de
// Supabase Auth. Sin esto, la falta de stack se ve como un timeout mudo en el login (c.8).
export async function assertStackUp(request: APIRequestContext): Promise<void> {
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
  const res = await request.get(`${supabase}/auth/v1/health`, { timeout: 5_000 }).catch(() => null);
  if (!res || !res.ok()) {
    throw new Error(
      `Supabase local no responde en ${supabase}. Levantalo con: cd webApp && npx supabase start (requiere colima/docker).`,
    );
  }
}

// Los <label> de /entrar no estan asociados a su input, asi que no hay nombre accesible: se
// localiza por tipo de input. networkidle espera la hidratacion; sin ella el submit es un POST nativo.
export async function login(page: Page, user: Pick<SeedUser, "email" | "password">): Promise<void> {
  await page.goto("/entrar", { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').fill(user.email);
  await page.locator('input[type="password"]').fill(user.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/panel$/);
}

// La ficha solo renderiza los links del modulo abierto (uno a la vez), asi que se abre cada uno.
export async function lessonHrefs(page: Page, slug: string): Promise<string[]> {
  await page.goto(`/cursos/${slug}`, { waitUntil: "networkidle" });
  const triggers = page.locator('button[aria-controls^="modulo-panel-"]');
  const hrefs = new Set<string>();
  for (let i = 0; i < (await triggers.count()); i++) {
    const trigger = triggers.nth(i);
    if ((await trigger.getAttribute("aria-expanded")) !== "true") {
      await trigger.click();
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
    }
    const panelId = await trigger.getAttribute("aria-controls");
    const links = page.locator(`[id="${panelId}"] a[href^="/leccion/"]`);
    for (const href of await links.evaluateAll((els) => els.map((el) => el.getAttribute("href")))) {
      if (href) hrefs.add(href);
    }
  }
  return [...hrefs];
}

// ---------------------------------------------------------------- T-044 · recursos descargables
export const REVOCADA = { email: "revocada@test.local", password: "test-1234" };

export const RECURSO = {
  preview: "e0440000-0000-4000-8000-000000000001",
  link: "e0440000-0000-4000-8000-000000000002",
  herbario: "e0440000-0000-4000-8000-000000000003",
} as const;

// La anon key es publica por diseño (NEXT_PUBLIC_); se lee de .env.local para no duplicarla.
function supabasePublicEnv(): { url: string; anonKey: string } {
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      process.loadEnvFile(".env.local");
    } catch {
      // Sin archivo: el error de abajo dice que falta y desde donde correr.
    }
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) throw new Error("Falta NEXT_PUBLIC_SUPABASE_ANON_KEY (webApp/.env.local). Correr desde webApp/.");
  return { url, anonKey };
}

// `lesson_resources.lesson_id` esta en el grant de anon (0003): se resuelve sin sesion ni service key.
export async function lessonIdOfResource(request: APIRequestContext, resourceId: string): Promise<string> {
  const { url, anonKey } = supabasePublicEnv();
  const res = await request.get(`${url}/rest/v1/lesson_resources?id=eq.${resourceId}&select=lesson_id`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  });
  const rows = (await res.json()) as { lesson_id: string }[];
  if (!res.ok() || rows.length !== 1) {
    throw new Error(`El recurso ${resourceId} no esta en la base (status ${res.status()}). Correr: npx supabase db reset`);
  }
  return rows[0].lesson_id;
}

// Toda denegacion del handler es identica: 403, cuerpo vacio, sin cache y sin Location.
export async function expectDenied(res: import("@playwright/test").APIResponse): Promise<void> {
  expect(res.status()).toBe(403);
  expect(await res.text()).toBe("");
  expect(res.headers()["cache-control"]).toBe("private, no-store");
  expect(res.headers()["location"]).toBeUndefined();
}

// ---------------------------------------------------------------- T-030 · Q&A por leccion
// La duena de tarot-iniciatico (`SOL`) se declara arriba, compartida con T-037.

// T-043/T-030 · desde T-040 el login redirige por rol (admin → /panel/admin, docente → /panel/docente),
// asi que `login` solo sirve para alumnas. Este recibe el destino esperado como ruta (anclada al
// final para que /panel no se confunda con /panel/admin) o como RegExp.
export async function loginAs(
  page: Page,
  user: Pick<SeedUser, "email" | "password">,
  expected: string | RegExp,
): Promise<void> {
  await page.goto("/entrar", { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').fill(user.email);
  await page.locator('input[type="password"]').fill(user.password);
  await page.locator('button[type="submit"]').click();
  const landing =
    typeof expected === "string"
      ? new RegExp(`${expected.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}$`)
      : expected;
  await expect(page).toHaveURL(landing);
}

// Una leccion preview es publica, asi que probar con ella pasaria por la razon equivocada. Las
// no-preview son las que la inscripta ve y un anonimo no: diferencia de conjuntos.
export async function nonPreviewLessonHref(browser: Browser): Promise<string> {
  const anon = await browser.newPage();
  const publicHrefs = new Set(await lessonHrefs(anon, ALUMNA.enrolledSlug));
  await anon.close();

  const enrolled = await browser.newPage();
  await login(enrolled, ALUMNA);
  const enrolledHrefs = await lessonHrefs(enrolled, ALUMNA.enrolledSlug);
  await enrolled.close();

  const href = enrolledHrefs.find((h) => !publicHrefs.has(h));
  if (!href) {
    throw new Error(
      `En ${ALUMNA.enrolledSlug} la inscripta no ve ninguna leccion que no sea preview (${enrolledHrefs.length} links): revisa el seed.`,
    );
  }
  return href;
}
