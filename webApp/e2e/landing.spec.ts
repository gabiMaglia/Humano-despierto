import { expect, test } from "@playwright/test";
import { assertStackUp } from "./fixtures";

// T-053: la portada no inventa nada. Se siembran 3 reseñas de 5 estrellas con texto + 1 oculta
// sobre un curso sin otros specs encima, y se limpian al terminar.
const SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const H = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
const SLUG = "arcanos-menores";
const TEXTOS = ["Landing e2e: voz uno", "Landing e2e: voz dos", "Landing e2e: voz tres"];
const OCULTA = "Landing e2e: reseña oculta por admin";

let courseId = "";

test.beforeAll(async ({ request }) => {
  test.skip(!SERVICE, "falta SUPABASE_SERVICE_ROLE_KEY (webApp/.env.local)");
  await assertStackUp(request);
  const c = await request.get(`${SUPABASE}/rest/v1/courses?select=id&slug=eq.${SLUG}`, { headers: H });
  courseId = (await c.json())[0].id;
  const p = await request.get(`${SUPABASE}/rest/v1/profiles?select=id&role=eq.student&limit=4`, { headers: H });
  const ids = (await p.json()).map((r: { id: string }) => r.id) as string[];
  expect(ids.length).toBeGreaterThanOrEqual(4);
  await request.delete(`${SUPABASE}/rest/v1/course_reviews?course_id=eq.${courseId}`, { headers: H });
  const rows = [...TEXTOS, OCULTA].map((body, i) => ({ course_id: courseId, user_id: ids[i], rating: 5, body }));
  const res = await request.post(`${SUPABASE}/rest/v1/course_reviews`, { headers: H, data: rows });
  expect(res.ok(), await res.text()).toBe(true);
  // La CHECK `hidden_consistency` exige los tres campos juntos.
  const hide = await request.patch(`${SUPABASE}/rest/v1/course_reviews?course_id=eq.${courseId}&body=eq.${encodeURIComponent(OCULTA)}`, {
    headers: H,
    data: { hidden_at: new Date().toISOString(), hidden_by: ids[0], hidden_reason: "e2e" },
  });
  expect(hide.ok(), await hide.text()).toBe(true);
});

test.afterAll(async ({ request }) => {
  if (courseId) await request.delete(`${SUPABASE}/rest/v1/course_reviews?course_id=eq.${courseId}`, { headers: H });
});

test("la portada no trae cifras inventadas y los testimonios son reseñas reales", async ({ page, request }) => {
  await page.goto("/");
  const hero = page.locator("section").first();
  for (const falso of ["2k", "Cursos vivos", "Iniciadas"]) await expect(hero).not.toContainText(falso);

  const count = await request.get(`${SUPABASE}/rest/v1/courses?select=id&status=eq.published`, {
    headers: { ...H, Prefer: "count=exact", Range: "0-0" },
  });
  const publicados = Number(count.headers()["content-range"].split("/")[1]);
  await expect(hero.getByText(/^Cursos?$/)).toBeVisible();
  await expect(hero.getByText(new RegExp(`^${publicados}$`)).first()).toBeVisible();

  for (const t of TEXTOS) await expect(page.getByText(t)).toBeVisible();
  await expect(page.getByText(OCULTA)).toHaveCount(0);
  await expect(page.getByText("testimonios ilustrativos")).toHaveCount(0);
  await expect(page.getByText("Iris Maldonado")).toHaveCount(0);

  await expect(page.getByText(/^\d+ cursos?$/).first()).toBeVisible();
  await expect(page.getByText("Calendario lunar")).toBeVisible();
});
