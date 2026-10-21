import { expect, test } from "@playwright/test";
import { ALUMNA, login } from "./fixtures";

test("alumna entra y llega a /panel con la sesion en cookie", async ({ page, context }) => {
  await login(page, ALUMNA);
  const cookies = await context.cookies();
  expect(cookies.some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"))).toBe(true);
  await expect(page.locator("h1").first()).toBeVisible();
});
