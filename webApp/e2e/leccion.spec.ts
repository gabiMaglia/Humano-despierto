import { expect, test } from "@playwright/test";
import { ALUMNA, DELFINA, login, nonPreviewLessonHref } from "./fixtures";

test("inscripta: una leccion no-preview muestra el iframe de YouTube", async ({ browser, page }) => {
  const href = await nonPreviewLessonHref(browser);
  await login(page, ALUMNA);
  const res = await page.goto(href);
  expect(res?.status()).toBe(200);
  await expect(page.locator("iframe")).toHaveAttribute("src", /youtube\.com/);
});

test("no inscripta: la misma leccion responde 404 y no hay iframe (R-8)", async ({ browser, page }) => {
  const href = await nonPreviewLessonHref(browser);
  await login(page, DELFINA);
  const res = await page.goto(href);
  expect(res?.status()).toBe(404);
  await expect(page.locator("iframe")).toHaveCount(0);
});
