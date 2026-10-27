import { psql } from "./db";
import { expect, test, userIdByEmail, ALUMNA, ADMIN, DELFINA, REVOCADA } from "./fixtures";

// El catálogo pagina: se mira siempre /cursos?disciplina=reiki, donde caben reiki-nivel-3 y el curso propio.
const REIKI = "/cursos?disciplina=reiki";

// Las reseñas se siembran con service_role (única vía que no exige UI de alumna) y se limpian al
// terminar. La base demo ya trae reseñas en casi todos los cursos, así que el spec no depende de
// ella: usa reiki-nivel-3 (sin reseñas a propósito en demo.sql, nada que pisar) y un curso
// publicado propio, sin reseñas, que borra al final. Nunca toca las reseñas de otros cursos.
try {
  process.loadEnvFile(".env.local");
} catch {
  // Sin archivo: el skip de abajo lo dice.
}
const SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const H = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
const CON = "reiki-nivel-3";
const SIN = `e2e-sin-resenas-${Date.now()}`;
const SOL_ID = "a0000000-0000-4000-8000-000000000002";

// PostgREST exige las mismas claves en todas las filas de un POST en lote.
const VISIBLE = { hidden_at: null, hidden_by: null, hidden_reason: null };

let courseId = "";

test.beforeAll(async ({ request }) => {
  test.skip(!SERVICE, "falta SUPABASE_SERVICE_ROLE_KEY (webApp/.env.local)");
  psql(
    `insert into public.courses (slug, title, discipline, level, teacher_id, status, published_at)
     values ('${SIN}', 'Curso sin reseñas e2e', 'Reiki', 'Inicial', '${SOL_ID}', 'published', '2000-01-01')`,
  );
  const c = await request.get(`${SUPABASE}/rest/v1/courses?select=id&slug=eq.${CON}`, { headers: H });
  courseId = (await c.json())[0].id;
  await request.delete(`${SUPABASE}/rest/v1/course_reviews?course_id=eq.${courseId}`, { headers: H });
  const res = await request.post(`${SUPABASE}/rest/v1/course_reviews`, {
    headers: H,
    data: [
      { course_id: courseId, user_id: await userIdByEmail(request, ALUMNA.email), rating: 5, body: "Muy buen curso", ...VISIBLE },
      { course_id: courseId, user_id: await userIdByEmail(request, DELFINA.email), rating: 4, body: null, ...VISIBLE },
      // D-28: una reseña oculta (1 estrella) que, si entrara al promedio, lo bajaría a 3,3 y a 3 reseñas.
      {
        course_id: courseId,
        user_id: await userIdByEmail(request, REVOCADA.email),
        rating: 1,
        body: null,
        hidden_at: new Date().toISOString(),
        hidden_by: await userIdByEmail(request, ADMIN.email),
        hidden_reason: "e2e D-28",
      },
    ],
  });
  expect(res.ok(), await res.text()).toBe(true);
});

test.afterAll(async ({ request }) => {
  psql(`delete from public.courses where slug = '${SIN}'`);
  if (courseId) await request.delete(`${SUPABASE}/rest/v1/course_reviews?course_id=eq.${courseId}`, { headers: H });
});

function card(page: import("@playwright/test").Page, slug: string) {
  return page.locator(`a[href="/cursos/${slug}"]`).first();
}

test("el catálogo muestra el rating del curso con reseñas", async ({ page }) => {
  await page.goto(REIKI);
  const c = card(page, CON);
  await expect(c).toContainText("4,5 · 2 reseñas");
  await expect(c.locator(".sr-only")).toContainText("4.5 de 5 estrellas");
});

test("una reseña oculta no entra al promedio ni al conteo, ni en el catálogo ni en la ficha (D-28)", async ({ page }) => {
  await page.goto(REIKI);
  await expect(card(page, CON)).toContainText("4,5 · 2 reseñas");
  await expect(card(page, CON)).not.toContainText("3,3");
  await page.goto(`/cursos/${CON}`);
  await expect(page.getByText("2 testimonios")).toBeVisible();
  await expect(page.getByText("3 testimonios")).toHaveCount(0);
});

// ADR-015 / spec Brote: sin reseñas la tarjeta dice que el curso es nuevo (decisión del PO
// 2026-10-22). Sigue sin estrellas, sin promedio y sin conteo inventado.
test("un curso sin reseñas no dibuja ninguna señal de puntaje", async ({ page }) => {
  await page.goto(REIKI);
  const sin = card(page, SIN);
  await expect(sin).toBeVisible();
  await expect(sin).toContainText("Curso nuevo, todavía sin reseñas");
  await expect(sin).not.toContainText(/\d+ reseñas?/);
  await expect(sin).not.toContainText("estrellas");
  await expect(sin).not.toContainText("0,0");
  await expect(sin.locator(".sr-only")).toHaveCount(0);
});

test("la tarjeta coincide con la ficha del mismo curso", async ({ page }) => {
  await page.goto(`/cursos/${CON}`);
  await expect(page.getByText("4.5", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("2 testimonios")).toBeVisible();
});

test("orden=mejor-valorado pone al curso valorado antes que al que no tiene reseñas y no oculta los demás", async ({ page }) => {
  await page.goto(`${REIKI}&orden=mejor-valorado`);
  const hrefs = await page.locator('main a[href^="/cursos/"]').evaluateAll((els) =>
    els.map((e) => e.getAttribute("href")).filter((h) => h && !h.includes("?")),
  );
  // La demo trae otros cursos con puntaje: el orden absoluto no es de este spec, el relativo sí.
  expect(hrefs.indexOf(`/cursos/${CON}`)).toBeGreaterThanOrEqual(0);
  expect(hrefs.indexOf(`/cursos/${CON}`)).toBeLessThan(hrefs.indexOf(`/cursos/${SIN}`));
  await page.goto(REIKI);
  const sinOrden = await page.locator('main a[href^="/cursos/"]').count();
  await page.goto(`${REIKI}&orden=mejor-valorado`);
  expect(await page.locator('main a[href^="/cursos/"]').count()).toBe(sinOrden);
  await expect(page.getByRole("link", { name: "Mejor valorado" })).toHaveAttribute("aria-pressed", "true");
});
