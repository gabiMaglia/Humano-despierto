import { expect, test, loginAs } from "./fixtures";
import { DOCENTE } from "./account";
import { psql } from "./db";

// D-100 · el error de una action va al campo culpable. Un slug repetido no crea nada en la base.
test("crear un curso con un slug que ya existe marca el campo Slug, no el formulario", async ({ page }) => {
  const antes = psql("select count(*) from public.courses;");
  await loginAs(page, DOCENTE, /\/panel/);
  await page.goto("/panel/docente/nuevo");
  await page.getByLabel("Slug (URL)").fill("tarot-iniciatico");
  await page.getByLabel("Título", { exact: true }).fill("Curso e2e D-100");
  await page.getByLabel("Disciplina").fill("Tarot");
  await page.getByLabel("Nivel").fill("Iniciación");
  await page.getByLabel("Precio").fill("240");
  await page.getByRole("button", { name: "Crear curso" }).click();

  const slug = page.getByLabel("Slug (URL)");
  await expect(slug).toHaveAttribute("aria-invalid", "true");
  const errorId = await slug.getAttribute("aria-describedby");
  await expect(page.locator(`[id="${errorId}"]`)).toHaveText(/Ya existe un curso con ese slug/);
  await expect(page.getByLabel("Título", { exact: true })).not.toHaveAttribute("aria-invalid", "true");
  expect(psql("select count(*) from public.courses;")).toBe(antes);
});
