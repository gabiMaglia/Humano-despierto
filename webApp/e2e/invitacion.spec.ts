import type { Page } from "@playwright/test";
import { expect, test, ALUMNA, assertStackUp } from "./fixtures";
import { ADMIN, PASSWORD, fillLogin, fillRegister, freshEmail, loginAt, register } from "./account";
import { authLinkFor, invitationLinkFor } from "./mailpit";

async function invite(page: Page, email: string): Promise<void> {
  await loginAt(page, "/entrar", ADMIN.email, ADMIN.password);
  await expect(page).toHaveURL(/\/panel\/admin$/);
  await page.goto("/panel/admin/invitaciones", { waitUntil: "networkidle" });
  await page.getByLabel("Mail de la docente").fill(email);
  await page.getByRole("button", { name: "Invitar" }).click();
  await expect(page.getByRole("status").first()).toContainText(/Invitación enviada a .+, vence el \d+ de \w+ de \d{4}/);
}

test.beforeEach(async ({ page }) => {
  await assertStackUp(page.request);
});

test("c.1 c.2 cuenta nueva: invitar, registrarse con ese mail, confirmar y entrar a /panel/docente", async ({ page, browser }) => {
  const email = freshEmail("invitada");
  await invite(page, email);
  const link = await invitationLinkFor(page.request, email);

  const ctx = await browser.newContext();
  const invitada = await ctx.newPage();
  await invitada.goto(link);
  await expect(invitada).toHaveURL(/\/entrar\?next=%2Finvitacion%2F/);
  await fillRegister(invitada, email, "Docente de Prueba");
  await expect(invitada.getByRole("status")).toContainText(/revisá tu mail/i);

  await invitada.goto(await authLinkFor(invitada.request, email, "signup"));
  await expect(invitada).toHaveURL(/\/panel\/docente$/);

  // Recargar el link es idempotente para quien ya aceptó.
  await invitada.goto(link);
  await expect(invitada).toHaveURL(/\/panel\/docente$/);
  await ctx.close();
});

test("c.2 cuenta existente: entra con su clave desde el link y queda docente", async ({ page, browser }) => {
  const email = freshEmail("existente");
  const previa = await browser.newContext();
  const alumna = await previa.newPage();
  await register(alumna, email);
  await alumna.goto(await authLinkFor(alumna.request, email, "signup"));
  await expect(alumna).toHaveURL(/\/panel$/);
  await previa.close();

  await invite(page, email);
  const link = await invitationLinkFor(page.request, email);

  const ctx = await browser.newContext();
  const invitada = await ctx.newPage();
  await invitada.goto(link);
  await fillLogin(invitada, email, PASSWORD);
  await expect(invitada).toHaveURL(/\/panel\/docente$/);
  await ctx.close();
});

test("c.3 otra cuenta con el link: mensaje neutro y sigue alumna", async ({ page, browser }) => {
  const email = freshEmail("ajena");
  await invite(page, email);
  const link = await invitationLinkFor(page.request, email);

  const ctx = await browser.newContext();
  const intrusa = await ctx.newPage();
  await loginAt(intrusa, "/entrar", ALUMNA.email, ALUMNA.password);
  await expect(intrusa).toHaveURL(/\/panel$/);
  await intrusa.goto(link);
  await expect(intrusa).toHaveURL(/\/invitacion\/invalida$/);
  await expect(intrusa.getByRole("heading", { level: 1 })).toContainText("no es válida o venció");
  await intrusa.goto("/panel/docente");
  await expect(intrusa).toHaveURL(/\/panel$/);
  await ctx.close();
});

test("c.7 c.8 invitar dos veces ofrece reenviar; la búsqueda muestra la revocada y la nueva", async ({ page }) => {
  const email = freshEmail("reenviar");
  await invite(page, email);
  await page.getByLabel("Mail de la docente").fill(email);
  await page.getByRole("button", { name: "Invitar" }).click();
  await expect(page.getByRole("status").first()).toContainText("Ya hay una invitación pendiente");
  await page.getByRole("button", { name: "Reenviar invitación" }).click();
  await expect(page.getByText(/Invitación reenviada a/)).toBeVisible();

  await page.goto(`/panel/admin/invitaciones?q=${encodeURIComponent(email)}`, { waitUntil: "networkidle" });
  const filas = page.locator("li", { hasText: email });
  await expect(filas).toHaveCount(2);
  await expect(filas.filter({ hasText: "Pendiente" })).toHaveCount(1);
  await expect(filas.filter({ hasText: "Revocada" })).toHaveCount(1);
});
