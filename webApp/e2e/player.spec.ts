import type { Page } from "@playwright/test";
import { expect, test, ALUMNA, lessonHrefs, login } from "./fixtures";

// T-045 · el player contra el stack real. La IFrame API corre en el navegador de verdad: la
// velocidad se afirma sobre lo que muestra el selector (que sale de onPlaybackRateChange).

async function openFirstLesson(page: Page): Promise<string> {
  await login(page, ALUMNA);
  const hrefs = await lessonHrefs(page, ALUMNA.enrolledSlug);
  expect(hrefs.length, "el seed debe dar al menos 2 lecciones a la alumna").toBeGreaterThan(1);
  await page.goto(hrefs[0]);
  await expect(page.locator("iframe")).toHaveAttribute("src", /youtube\.com/);
  return hrefs[0];
}

const speed = (page: Page) => page.getByLabel("Velocidad de reproducción");

test("velocidad: cambia solo tras el evento del player y persiste al recargar (c.4)", async ({ page }) => {
  await openFirstLesson(page);
  // Las opciones salen de getAvailablePlaybackRates(): antes de onReady solo existe 1×.
  await expect(speed(page).locator("option")).not.toHaveCount(1);
  await speed(page).selectOption("1.5");
  await expect(speed(page)).toHaveValue("1.5");

  await page.reload();
  await expect(speed(page).locator("option")).not.toHaveCount(1);
  await expect(speed(page)).toHaveValue("1.5");
});

test("?t=120 arranca en 120 s; ?t=abc y ?t=-3 se ignoran (c.8)", async ({ page }) => {
  const href = await openFirstLesson(page);

  await page.goto(`${href}?t=120`);
  await expect(page.locator("iframe")).toHaveAttribute("src", /[?&]start=120(&|$)/);
  await expect(page.locator("span", { hasText: /^2:00\s*\// })).toBeVisible();

  for (const bad of ["abc", "-3"]) {
    await page.goto(`${href}?t=${bad}`);
    await expect(page.locator("iframe")).toHaveAttribute("src", /youtube\.com/);
    expect(await page.locator("iframe").getAttribute("src")).not.toMatch(/start=(120|-3)/);
  }
});

test("'Siguiente lección' lleva a la siguiente publicada del currículum (c.1)", async ({ page }) => {
  await openFirstLesson(page);
  await page.getByRole("tab", { name: "Currículum" }).click();
  const links = page.getByRole("tabpanel").locator('a[href^="/leccion/"]');
  const hrefs = await links.evaluateAll((els) => els.map((el) => el.getAttribute("href")));
  const currentIdx = await links.evaluateAll((els) => els.findIndex((el) => el.getAttribute("aria-current") === "page"));
  expect(currentIdx).toBeGreaterThanOrEqual(0);
  const expected = hrefs[currentIdx + 1];
  expect(expected).toBeTruthy();

  await page.getByRole("link", { name: "Siguiente lección" }).click();
  await expect(page).toHaveURL(new RegExp(`${expected}$`));
});

test("notas: se editan conservando el momento y se borran sin recargar (c.7)", async ({ page }) => {
  await openFirstLesson(page);
  await page.getByRole("tab", { name: "Notas" }).click();
  const original = `nota e2e ${Date.now()}`;
  await page.getByLabel("Nueva nota").fill(original);
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  const item = page.getByRole("listitem").filter({ hasText: original });
  await expect(item).toBeVisible();
  const clock = await item.locator("span").first().innerText();

  await item.getByRole("button", { name: "Editar" }).click();
  await item.getByLabel("Editar nota").fill(`${original} editada`);
  await item.getByRole("button", { name: "Guardar cambios" }).click();
  const edited = page.getByRole("listitem").filter({ hasText: `${original} editada` });
  await expect(edited).toBeVisible();
  await expect(edited.locator("span").first()).toHaveText(clock);

  await edited.getByRole("button", { name: "Borrar" }).click();
  await expect(page.getByText(original)).toHaveCount(0);
});

test.describe("móvil 390x844 (c.5)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("las pestañas quedan debajo del video, en un solo tablist, y se navegan con flechas", async ({ page }) => {
    await openFirstLesson(page);
    await expect(page.getByRole("tablist")).toHaveCount(1);

    const tabs = page.getByRole("tab");
    // T-030 suma "Preguntas": cuatro pestañas, todas visibles en móvil.
    await expect(tabs).toHaveCount(4);
    for (let i = 0; i < 4; i++) await expect(tabs.nth(i)).toBeVisible();

    const video = await page.locator("iframe").boundingBox();
    const list = await page.getByRole("tablist").boundingBox();
    expect(list!.y).toBeGreaterThan(video!.y + video!.height - 1);

    await page.getByRole("tab", { name: "Currículum" }).click();
    await page.getByRole("tab", { name: "Currículum" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Notas" })).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Recursos" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel")).toBeVisible();
  });
});
