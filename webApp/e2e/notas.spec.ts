import { expect, test, ALUMNA, REVOCADA, lessonHrefs, login } from "./fixtures";

// T-046 · /panel/notas contra el stack real. El seed no trae notas: se crean desde la UI del
// player (la misma vía que usa la alumna) y se borran al final, pase o falle el test.

test("anónima: /panel/notas redirige a /entrar (c.6)", async ({ page }) => {
  await page.goto("/panel/notas");
  await expect(page).toHaveURL(/\/entrar/);
});

test("alumna: ve su nota agrupada y el link lleva al segundo exacto (c.1, c.2)", async ({ page }) => {
  await login(page, ALUMNA);
  const hrefs = await lessonHrefs(page, ALUMNA.enrolledSlug);
  const lessonHref = hrefs[0];
  const body = `nota panel ${Date.now()}`;

  await page.goto(`${lessonHref}?t=120`);
  await expect(page.locator("span", { hasText: /^2:00\s*\// })).toBeVisible();
  await page.getByRole("tab", { name: "Notas" }).click();
  await page.getByLabel("Nueva nota").fill(body);
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  const saved = page.getByRole("listitem").filter({ hasText: body });
  await expect(saved).toBeVisible();

  try {
    await page.goto("/panel/notas");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    const section = page.getByRole("region").filter({ has: page.getByRole("heading", { level: 2 }) }).first();
    await expect(section.getByRole("heading", { level: 3 })).not.toHaveCount(0);
    const item = page.getByRole("listitem").filter({ hasText: body });
    await expect(item).toBeVisible();

    const link = item.getByRole("link");
    await expect(link).toHaveText("2:00");
    await expect(link).toHaveAttribute("href", /^\/leccion\/[0-9a-f-]+\?t=120$/);
    await link.click();
    await expect(page).toHaveURL(/\/leccion\/[0-9a-f-]+\?t=120$/);
    await expect(page.locator("iframe")).toHaveAttribute("src", /[?&]start=120(&|$)/);
  } finally {
    await page.goto(lessonHref);
    await page.getByRole("tab", { name: "Notas" }).click();
    const leftover = page.getByRole("listitem").filter({ hasText: body });
    await leftover.getByRole("button", { name: "Borrar" }).click();
    await expect(page.getByText(body)).toHaveCount(0);
  }
});

test("alumna sin notas: estado vacío con link al panel y sin encabezados de curso (c.3)", async ({ page }) => {
  await login(page, REVOCADA);
  await page.goto("/panel/notas");
  await expect(page.getByText("Todavía no escribiste ninguna nota")).toBeVisible();
  await expect(page.getByRole("link", { name: /Volver al panel/ })).toHaveAttribute("href", "/panel");
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(0);
});
