import type { APIRequestContext } from "@playwright/test";
import { ALUMNA, assertStackUp, expect, login, test } from "./fixtures";

try {
  process.loadEnvFile(".env.local");
} catch {
  // Sin archivo: el skip de abajo lo dice.
}
const SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const H = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
const WINDOW_S = 600;

async function alumnaId(request: APIRequestContext): Promise<string> {
  const users = await (await request.get(`${SUPABASE}/auth/v1/admin/users?per_page=200`, { headers: H })).json();
  return users.users.find((u: { email: string }) => u.email === ALUMNA.email).id as string;
}

async function courseId(request: APIRequestContext): Promise<string> {
  const res = await request.get(`${SUPABASE}/rest/v1/courses?select=id&slug=eq.${ALUMNA.enrolledSlug}`, { headers: H });
  return (await res.json())[0].id as string;
}

async function cleanup(request: APIRequestContext, uid: string, cid: string): Promise<void> {
  await request.delete(`${SUPABASE}/rest/v1/course_reviews?course_id=eq.${cid}&user_id=eq.${uid}`, { headers: H });
  await request.delete(`${SUPABASE}/rest/v1/rate_limit_buckets?key=eq.saveReviewAction:u:${uid}`, { headers: H });
}

test("c.1 · la sexta reseña seguida muestra el mensaje humano y no escribe", async ({ page, request }) => {
  test.skip(!SERVICE, "falta SUPABASE_SERVICE_ROLE_KEY (webApp/.env.local)");
  test.setTimeout(240_000);
  await assertStackUp(request);
  const uid = await alumnaId(request);
  const cid = await courseId(request);
  await cleanup(request, uid, cid);

  // Ventana fija de 600 s alineada al epoch: si faltan menos de 90 s para el borde, las seis
  // podrían repartirse en dos ventanas y la sexta pasaría por la razón equivocada. Se espera el borde.
  const toEdge = WINDOW_S - (Math.floor(Date.now() / 1000) % WINDOW_S);
  if (toEdge < 90) await page.waitForTimeout((toEdge + 2) * 1000);

  await login(page, ALUMNA);
  await page.goto(`/cursos/${ALUMNA.enrolledSlug}`, { waitUntil: "networkidle" });
  const form = page.locator("form").filter({ has: page.locator("#review-body") });
  await expect(form).toBeVisible();

  for (let i = 1; i <= 6; i++) {
    await form.getByRole("button", { name: "5 estrellas" }).click();
    await form.locator("#review-body").fill(`e2e-rl intento ${i}`);
    // El estado de la vuelta anterior sigue en pantalla: se espera la respuesta del POST, no el texto.
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes(`/cursos/${ALUMNA.enrolledSlug}`)),
      form.locator('button[type="submit"]').click(),
    ]);
    const status = form.getByRole("status");
    if (i < 6) await expect(status).toHaveText(/Gracias por dejar tu reseña\.|Reseña actualizada\./);
    else await expect(status).toHaveText(/^Demasiados intentos\. Esperá \d+ (segundos|minutos) y volvé a probar\.$/);
    // React 19 resetea el formulario cuando termina la transición de la action (el textarea vuelve
    // al defaultValue del render nuevo). Si la vuelta siguiente escribe antes de ese reset, se manda
    // el texto viejo: se espera a que el botón deje de estar pendiente, y recién ahí el textarea
    // tiene que mostrar lo guardado (prueba además que el guardado i llegó a la base).
    await expect(form.locator('button[type="submit"]')).not.toHaveText("Guardando…");
    if (i < 6) await expect(form.locator("#review-body")).toHaveValue(`e2e-rl intento ${i}`);
  }

  const review = await (await request.get(
    `${SUPABASE}/rest/v1/course_reviews?select=body&course_id=eq.${cid}&user_id=eq.${uid}`, { headers: H })).json();
  expect(review).toEqual([{ body: "e2e-rl intento 5" }]);
  const buckets = await (await request.get(
    `${SUPABASE}/rest/v1/rate_limit_buckets?select=hits&key=eq.saveReviewAction:u:${uid}`, { headers: H })).json();
  expect(buckets.reduce((n: number, b: { hits: number }) => n + b.hits, 0)).toBe(6);

  await cleanup(request, uid, cid);
});
