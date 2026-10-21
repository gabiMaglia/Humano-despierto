import { expect, test, ALUMNA, DELFINA } from "./fixtures";

// El seed no trae reseñas: se siembran con service_role (única vía que no exige UI de alumna) y
// se limpian al terminar. Curso con reseñas: tarot-iniciatico; sin reseñas: cualquier otro.
const SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const H = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
const CON = "tarot-iniciatico";

let courseId = "";

test.beforeAll(async ({ request }) => {
  test.skip(!SERVICE, "falta SUPABASE_SERVICE_ROLE_KEY (webApp/.env.local)");
  const c = await request.get(`${SUPABASE}/rest/v1/courses?select=id&slug=eq.${CON}`, { headers: H });
  courseId = (await c.json())[0].id;
  const users = await (await request.get(`${SUPABASE}/auth/v1/admin/users?per_page=200`, { headers: H })).json();
  const idOf = (email: string) => users.users.find((u: { email: string }) => u.email === email).id as string;
  await request.delete(`${SUPABASE}/rest/v1/course_reviews?course_id=eq.${courseId}`, { headers: H });
  const res = await request.post(`${SUPABASE}/rest/v1/course_reviews`, {
    headers: H,
    data: [
      { course_id: courseId, user_id: idOf(ALUMNA.email), rating: 5, body: "Muy buen curso" },
      { course_id: courseId, user_id: idOf(DELFINA.email), rating: 4, body: null },
    ],
  });
  expect(res.ok(), await res.text()).toBe(true);
});

test.afterAll(async ({ request }) => {
  if (courseId) await request.delete(`${SUPABASE}/rest/v1/course_reviews?course_id=eq.${courseId}`, { headers: H });
});

function card(page: import("@playwright/test").Page, slug: string) {
  return page.locator(`a[href="/cursos/${slug}"]`).first();
}

test("el catálogo muestra el rating del curso con reseñas", async ({ page }) => {
  await page.goto("/cursos");
  const c = card(page, CON);
  await expect(c).toContainText("4,5 · 2 reseñas");
  await expect(c.locator(".sr-only")).toContainText("4.5 de 5 estrellas");
});

test("un curso sin reseñas no dibuja ninguna señal", async ({ page }) => {
  await page.goto("/cursos");
  const sin = card(page, "reiki-nivel-1");
  await expect(sin).toBeVisible();
  await expect(sin).not.toContainText("reseña");
  await expect(sin).not.toContainText("0,0");
  await expect(sin.locator(".sr-only")).toHaveCount(0);
});

test("la tarjeta coincide con la ficha del mismo curso", async ({ page }) => {
  await page.goto(`/cursos/${CON}`);
  await expect(page.getByText("4.5", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("2 testimonios")).toBeVisible();
});

test("orden=mejor-valorado pone primero al curso valorado y no oculta los demás", async ({ page }) => {
  await page.goto("/cursos?orden=mejor-valorado");
  const hrefs = await page.locator('main a[href^="/cursos/"]').evaluateAll((els) =>
    els.map((e) => e.getAttribute("href")).filter((h) => h && !h.includes("?")),
  );
  expect(hrefs[0]).toBe(`/cursos/${CON}`);
  await page.goto("/cursos");
  const sinOrden = await page.locator('main a[href^="/cursos/"]').count();
  await page.goto("/cursos?orden=mejor-valorado");
  expect(await page.locator('main a[href^="/cursos/"]').count()).toBe(sinOrden);
  await expect(page.getByRole("link", { name: "Mejor valorado" })).toHaveAttribute("aria-pressed", "true");
});
