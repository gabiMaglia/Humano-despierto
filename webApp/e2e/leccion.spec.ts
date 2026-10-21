import { expect, test, type Browser } from "@playwright/test";
import { ALUMNA, DELFINA, lessonHrefs, login } from "./fixtures";

// Una leccion preview es publica, asi que probar con ella el negativo pasaria por la razon
// equivocada. Las no-preview son las que la inscripta ve y un anonimo no: diferencia de conjuntos.
async function nonPreviewLessonHref(browser: Browser): Promise<string> {
  const anon = await browser.newPage();
  const publicHrefs = new Set(await lessonHrefs(anon, ALUMNA.enrolledSlug));
  await anon.close();

  const enrolled = await browser.newPage();
  await login(enrolled, ALUMNA);
  const enrolledHrefs = await lessonHrefs(enrolled, ALUMNA.enrolledSlug);
  await enrolled.close();

  const href = enrolledHrefs.find((h) => !publicHrefs.has(h));
  if (!href) {
    throw new Error(
      `En ${ALUMNA.enrolledSlug} la inscripta no ve ninguna leccion que no sea preview (${enrolledHrefs.length} links): revisa el seed.`,
    );
  }
  return href;
}

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
