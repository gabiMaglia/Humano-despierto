import { expect, test } from "./fixtures";
import { psql } from "./db";

test("la ficha de un curso publicado responde 200 sin sesion con el titulo en h1", async ({ page }) => {
  const res = await page.goto("/cursos/tarot-iniciatico");
  expect(res?.status()).toBe(200);
  await expect(page.locator("h1")).toContainText(/tarot/i);
});

// D-67 · «Clase gratis» sólo sobre el curso que tiene una lección publicada `is_preview`.
test("el catálogo dice Clase gratis exactamente de los cursos que la tienen", async ({ page }) => {
  const conPreview = new Set(
    psql(
      `select string_agg(distinct c.slug, ',') from public.courses c join public.lessons l on l.course_id = c.id
        where c.status = 'published' and l.is_published and l.is_preview;`,
    ).split(",").filter(Boolean),
  );
  await page.goto("/cursos");
  const cards = page.locator('a[href^="/cursos/"]').filter({ has: page.locator("h3") });
  const n = await cards.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) {
    const card = cards.nth(i);
    const slug = (await card.getAttribute("href"))!.replace("/cursos/", "");
    await expect(card.getByText("Clase gratis", { exact: true })).toHaveCount(conPreview.has(slug) ? 1 : 0);
  }
});

// D-62/D-69 · la guía sin avatar se ve con sus iniciales, nunca con una foto de stock.
test("las guías sin avatar no muestran un retrato de stock", async ({ page }) => {
  await page.goto("/guias");
  await expect(page.locator('article img[src*="unsplash"]')).toHaveCount(0);
  await page.goto("/cursos/tarot-iniciatico");
  const guia = page.locator('section[aria-labelledby="guia-titulo"]');
  await expect(guia.locator('img[src*="unsplash"]')).toHaveCount(0);
});
