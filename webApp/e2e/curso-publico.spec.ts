import { expect, test } from "@playwright/test";

test("la ficha de un curso publicado responde 200 sin sesion con el titulo en h1", async ({ page }) => {
  const res = await page.goto("/cursos/tarot-iniciatico");
  expect(res?.status()).toBe(200);
  await expect(page.locator("h1")).toContainText(/tarot/i);
});
