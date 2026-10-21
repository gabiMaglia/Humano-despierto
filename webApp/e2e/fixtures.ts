import { expect, type APIRequestContext, type Page } from "@playwright/test";

export interface SeedUser {
  email: string;
  password: string;
  enrolledSlug: string;
}

export const ALUMNA: SeedUser = { email: "alumna@test.local", password: "test-1234", enrolledSlug: "tarot-iniciatico" };
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
