import { expect, test, ALUMNA, assertStackUp, login } from "./fixtures";
import { psql } from "./db";

const ALUMNA_ID = "d0000000-0000-4000-8000-000000000003";
const SLUG = "herbario-lunar";
const DE_LA_ALUMNA = `user_id = '${ALUMNA_ID}' and course_id = (select id from public.courses where slug = '${SLUG}')`;

const limpiar = () => psql(`delete from public.course_wishlist where user_id = '${ALUMNA_ID}';`);

test.describe.configure({ mode: "serial" });
test.beforeAll(limpiar);
test.afterAll(limpiar);

test("c.2 · sin sesión, Guardar lleva a /entrar con next al catálogo y no crea nada", async ({ page, request }) => {
  await assertStackUp(request);
  await page.goto("/cursos");
  await page.getByRole("link", { name: "Guardar curso" }).first().click();
  await expect(page).toHaveURL(/\/entrar\?next=(%2F|\/)cursos$/);
  expect(psql(`select count(*) from public.course_wishlist where user_id = '${ALUMNA_ID}';`)).toBe("0");
});

test("c.1 + c.4 · la alumna guarda desde el catálogo, lo ve en Guardados y lo quita", async ({ page }) => {
  const title = psql(`select title from public.courses where slug = '${SLUG}';`);
  await login(page, ALUMNA);
  await page.goto(`/cursos?q=${encodeURIComponent(title)}`, { waitUntil: "networkidle" });

  const card = page.locator("div.group", { hasText: title });
  const guardar = card.getByRole("button", { name: "Guardar curso" });
  await expect(guardar).toHaveAttribute("aria-pressed", "false");
  await guardar.click();
  await expect(card.getByRole("button", { name: "Quitar de guardados" })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => psql(`select count(*) from public.course_wishlist where ${DE_LA_ALUMNA};`)).toBe("1");

  await page.goto("/panel?tab=guardados");
  const fila = page.getByRole("listitem").filter({ hasText: title });
  await expect(fila).toHaveCount(1);
  await fila.getByRole("button", { name: "Quitar de guardados" }).click();
  await expect.poll(() => psql(`select count(*) from public.course_wishlist where ${DE_LA_ALUMNA};`)).toBe("0");
  await expect(page.getByRole("listitem").filter({ hasText: title })).toHaveCount(0);
});

test("c.1 · en la ficha el botón guarda y el estado sobrevive al recargar", async ({ page }) => {
  await login(page, ALUMNA);
  await page.goto(`/cursos/${SLUG}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Guardar curso" }).click();
  await expect.poll(() => psql(`select count(*) from public.course_wishlist where ${DE_LA_ALUMNA};`)).toBe("1");
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByRole("button", { name: "Quitar de guardados" })).toHaveAttribute("aria-pressed", "true");
});

test("c.7 · una pestaña vacía tiene su propio vacío con salida al catálogo", async ({ page }) => {
  limpiar();
  await login(page, ALUMNA);
  await page.goto("/panel?tab=guardados");
  await expect(page.getByText("No guardaste ningún curso todavía.")).toBeVisible();
  await expect(page.getByRole("link", { name: /Explorar el catálogo/ })).toBeVisible();
});
