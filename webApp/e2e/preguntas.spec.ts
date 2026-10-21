import { expect, test } from "@playwright/test";
import { ALUMNA, SOL, login, loginAs, nonPreviewLessonHref } from "./fixtures";

// T-030 · el flujo del ticket de punta a punta. El título lleva marca de tiempo: el stack local es
// compartido y la pregunta queda (no hay acceso a la base desde Playwright para limpiarla).
test("la alumna pregunta, la docente responde y destaca, la alumna ve la destacada primero", async ({ browser }) => {
  const href = await nonPreviewLessonHref(browser);
  const title = `Por qué el arcano se invierte ${Date.now()}`;
  const answer = "La inversión es una pausa, no una caída.";

  const alumnaCtx = await browser.newContext();
  const alumna = await alumnaCtx.newPage();
  await login(alumna, ALUMNA);
  await alumna.goto(href);
  await alumna.getByRole("tab", { name: "preguntas" }).click();
  await alumna.getByLabel("Título de la pregunta").fill(title);
  await alumna.getByLabel("Tu pregunta").fill("En el minuto 12 no entendí la inversión.");
  await alumna.getByRole("button", { name: "Preguntar" }).click();
  await expect(alumna.getByRole("article", { name: title })).toBeVisible();

  const solCtx = await browser.newContext();
  const sol = await solCtx.newPage();
  await loginAs(sol, SOL, /\/panel\/docente$/);
  const res = await sol.goto(href);
  expect(res?.status(), "la docente dueña tiene que poder abrir su lección").toBe(200);
  await sol.getByRole("tab", { name: "preguntas" }).click();
  const solCard = sol.getByRole("article", { name: title });
  await solCard.getByLabel("Tu respuesta").fill(answer);
  await solCard.getByRole("button", { name: "Responder" }).click();
  await expect(solCard.getByText(answer)).toBeVisible();
  await solCard.getByRole("button", { name: "Destacar" }).click();
  await expect(solCard.getByLabel("Respuesta destacada")).toBeVisible();

  await alumna.reload();
  await alumna.getByRole("tab", { name: "preguntas" }).click();
  const first = alumna.getByRole("article", { name: title }).getByRole("listitem").first();
  await expect(first.getByLabel("Respuesta destacada")).toBeVisible();
  await expect(first).toContainText(answer);

  await alumnaCtx.close();
  await solCtx.close();
});

test("criterio 13: 'preguntas' entra en el ciclo de flechas del tablist", async ({ browser }) => {
  const href = await nonPreviewLessonHref(browser);
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await login(page, ALUMNA);
  await page.goto(href);
  await page.getByRole("tab", { name: "recursos" }).click();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "preguntas" })).toBeFocused();
  await expect(page.getByRole("tab", { name: "preguntas" })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Currículum" })).toBeFocused();
  await ctx.close();
});
