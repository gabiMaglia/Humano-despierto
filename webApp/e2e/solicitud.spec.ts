import { expect, test } from "@playwright/test";
import { ADMIN, ALUMNA, assertStackUp, login, loginAs } from "./fixtures";
import { psql } from "./db";

const ALUMNA_ID = "d0000000-0000-4000-8000-000000000003";
const SLUG = "herbario-lunar";
const DE_LA_ALUMNA = `user_id = '${ALUMNA_ID}' and course_id = (select id from public.courses where slug = '${SLUG}')`;

function borrarSolicitud(): void {
  psql(`delete from public.enrollments where ${DE_LA_ALUMNA};`);
}

function leccionNoPreview(): string {
  const id = psql(
    `select l.id from public.lessons l join public.courses c on c.id = l.course_id
      where c.slug = '${SLUG}' and l.is_published and not l.is_preview
      order by l.position limit 1;`,
  );
  if (!id) throw new Error(`${SLUG} no tiene lecciones publicadas no-preview: correr npx supabase db reset`);
  return id;
}

test.describe.configure({ mode: "serial" });
test.beforeAll(borrarSolicitud);
test.afterAll(borrarSolicitud);

test("c.1 · sin sesión, Solicitar inscripción lleva a /entrar con next y no crea nada", async ({ page, request }) => {
  await assertStackUp(request);
  await page.goto(`/cursos/${SLUG}`);
  await page.getByRole("link", { name: /Solicitar inscripción/ }).click();
  await expect(page).toHaveURL(/\/entrar\?next=(%2F|\/)cursos(%2F|\/)herbario-lunar$/);
  expect(psql(`select count(*) from public.enrollments where ${DE_LA_ALUMNA};`)).toBe("0");
});

test("c.2 + c.3 · la alumna pide, la ficha dice Solicitud enviada, el panel la lista y la lección sigue cerrada", async ({ page }) => {
  await login(page, ALUMNA);
  await page.goto(`/cursos/${SLUG}`);
  await page.getByRole("button", { name: /Solicitar inscripción/ }).click();

  await expect(page.getByText("Solicitud enviada").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Solicitar inscripción/ })).toHaveCount(0);
  expect(
    psql(
      `select status || ':' || (requested_at is not null)::text || ':' || coalesce(granted_by::text, 'null')
         from public.enrollments where ${DE_LA_ALUMNA};`,
    ),
  ).toBe("requested:true:null");

  await page.goto("/panel");
  await expect(page.getByRole("region", { name: /Solicitudes enviadas/ })).toContainText("Herbario");
  await expect(page.locator("article", { hasText: "Herbario" })).toHaveCount(0);

  const res = await page.goto(`/leccion/${leccionNoPreview()}`);
  expect(res?.status()).toBe(404);
});

test("c.6 · el admin aprueba y la alumna abre una lección no-preview", async ({ page }) => {
  await loginAs(page, ADMIN, "/panel/admin");
  const pendientes = page.getByRole("region", { name: /Solicitudes pendientes/ });
  const fila = pendientes.getByRole("listitem").filter({ hasText: "Herbario" }).filter({ hasText: "Alumna de Prueba" });
  await fila.getByRole("button", { name: "Aprobar" }).click();

  await expect.poll(() => psql(`select status from public.enrollments where ${DE_LA_ALUMNA};`)).toBe("active");
  await expect(pendientes.getByRole("listitem").filter({ hasText: "Herbario" }).filter({ hasText: "Alumna de Prueba" })).toHaveCount(0);
  expect(
    psql(`select (granted_by = 'd0000000-0000-4000-8000-000000000001')::text from public.enrollments where ${DE_LA_ALUMNA};`),
  ).toBe("true");

  await page.context().clearCookies();
  await login(page, ALUMNA);
  await page.goto("/panel");
  await expect(page.locator("article", { hasText: "Herbario" })).toHaveCount(1);
  const res = await page.goto(`/leccion/${leccionNoPreview()}`);
  expect(res?.status()).toBe(200);
  await expect(page.locator("iframe")).toHaveAttribute("src", /youtube\.com/);
});

test("c.12 · /inscribirme/<curso> es un 308 a la ficha y robots ya no lo lista", async ({ request }) => {
  const res = await request.get("/inscribirme/tarot-iniciatico", { maxRedirects: 0 });
  expect(res.status()).toBe(308);
  expect(res.headers()["location"]).toMatch(/\/cursos\/tarot-iniciatico$/);
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).not.toContain("/inscribirme");
});
