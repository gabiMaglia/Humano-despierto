import { expect, test, assertStackUp } from "./fixtures";

try {
  process.loadEnvFile(".env.local");
} catch {
  // Sin archivo: el skip de beforeAll lo dice.
}

// T-053: la portada no inventa nada. Se siembran 3 reseñas de 5 estrellas con texto + 1 oculta
// sobre un curso sin otros specs encima, y se limpian al terminar.
const SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const H = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
const SLUG = "arcanos-menores";
const TEXTOS = ["Landing e2e: voz uno", "Landing e2e: voz dos", "Landing e2e: voz tres"];
const OCULTA = "Landing e2e: reseña oculta por admin";

let courseId = "";
// El stack puede traer reseñas reales (demo) en este curso: se guardan y se reponen al terminar.
let previas: Record<string, unknown>[] = [];

// D-40 · la portada cachea conteos y testimonios 10 min, también en `next dev` (en disco, entre
// corridas). Este spec siembra reseñas y tiene que verlas: `no-cache` hace que dev no lea esa caché.
test.use({ extraHTTPHeaders: { "cache-control": "no-cache" } });

test.beforeAll(async ({ request }) => {
  test.skip(!SERVICE, "falta SUPABASE_SERVICE_ROLE_KEY (webApp/.env.local)");
  await assertStackUp(request);
  const c = await request.get(`${SUPABASE}/rest/v1/courses?select=id&slug=eq.${SLUG}`, { headers: H });
  courseId = (await c.json())[0].id;
  const p = await request.get(`${SUPABASE}/rest/v1/profiles?select=id&role=eq.student&limit=4`, { headers: H });
  const ids = (await p.json()).map((r: { id: string }) => r.id) as string[];
  expect(ids.length).toBeGreaterThanOrEqual(4);
  previas = await (await request.get(`${SUPABASE}/rest/v1/course_reviews?select=*&course_id=eq.${courseId}`, { headers: H })).json();
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
  if (!courseId) return;
  await request.delete(`${SUPABASE}/rest/v1/course_reviews?course_id=eq.${courseId}`, { headers: H });
  if (previas.length) {
    const res = await request.post(`${SUPABASE}/rest/v1/course_reviews`, { headers: H, data: previas });
    expect(res.ok(), await res.text()).toBe(true);
  }
});

test("la portada no trae cifras inventadas y los testimonios son reseñas reales", async ({ page, request }) => {
  await page.goto("/");
  // T-061 · las cifras dejaron el hero (B4): viven en su propia sección, con las mismas aserciones.
  const hero = page.locator('section[aria-labelledby="cifras-titulo"]');
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
