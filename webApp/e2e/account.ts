import type { Page } from "@playwright/test";

// Helpers de cuenta compartidos por cuenta.spec.ts e invitacion.spec.ts (T-049: segunda aparición).
export const PASSWORD = "clave-e2e-1";
// Fixtures del seed (T-038) con rol distinto de student; misma clave que ALUMNA.
export const ADMIN = { email: "admin@test.local", password: "test-1234" };
export const DOCENTE = { email: "docente@test.local", password: "test-1234" };

export function freshEmail(tag: string): string {
  return `e2e-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
}

// La página ya está en /entrar (p. ej. tras el redirect de una invitación): no navega.
// networkidle espera la hidratación: sin ella el submit es un envío nativo y no el de Supabase.
export async function fillRegister(page: Page, email: string, name = "Alumna de Prueba"): Promise<void> {
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Crear cuenta" }).first().click();
  await page.getByLabel("Nombre").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.locator('form button[type="submit"]').click();
}

export async function fillLogin(page: Page, email: string, password: string): Promise<void> {
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.locator('form button[type="submit"]').click();
}

export async function register(page: Page, email: string, name = "Alumna de Prueba"): Promise<void> {
  await page.goto("/entrar", { waitUntil: "networkidle" });
  await fillRegister(page, email, name);
}

export async function loginAt(page: Page, path: string, email: string, password: string): Promise<void> {
  await page.goto(path, { waitUntil: "networkidle" });
  await fillLogin(page, email, password);
}
