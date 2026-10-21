import { expect, test, type Page } from "@playwright/test";
import { assertStackUp } from "./fixtures";

// Sol Mayor es duena de `arcanos-menores` (seed.sql): publicado, no destacado y sin otros specs
// encima, a diferencia de `tarot-iniciatico`, que usan los de alumna.
const SOL = { email: "sol.mayor@seed.humano.local", password: "seed-teacher-1234" };
const SLUG = "arcanos-menores";
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);
const FIRMADA = /\/storage\/v1\/object\/sign\/uploads\/covers\//;
const CATALOGO_TAROT = "/cursos?disciplina=tarot";

async function loginDocente(page: Page) {
  await page.goto("/entrar", { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').fill(SOL.email);
  await page.locator('input[type="password"]').fill(SOL.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/panel\/docente$/);
}

async function abrirEditor(page: Page) {
  await page.goto("/panel/docente", { waitUntil: "networkidle" });
  await page.locator(`a[href^="/panel/docente/cursos/"]`, { hasText: "Arcanos" }).first().click();
  await expect(page.getByRole("heading", { name: "Portada" })).toBeVisible();
}

async function subir(page: Page, file: { name: string; mimeType: string; buffer: Buffer }) {
  await page.getByLabel(/Elegir portada/).setInputFiles(file);
  await page.getByRole("button", { name: "Subir portada" }).click();
}

const cardImg = (page: Page) => page.locator(`a[href="/cursos/${SLUG}"] img`);

test("c.1 + c.3 · la docente sube, la ve en catalogo y ficha, la reemplaza y la quita", async ({ page, browser, request }) => {
  await assertStackUp(request);
  await loginDocente(page);
  const anon = await browser.newContext();
  const pub = await anon.newPage();
  try {
    await abrirEditor(page);
    // Una corrida cortada a la mitad puede dejar portada: se arranca sin ella.
    const quitar = page.getByRole("button", { name: "Quitar portada" });
    if (await quitar.isVisible()) {
      await quitar.click();
      await expect(page.getByText("Portada quitada.")).toBeVisible();
    }

    await subir(page, { name: "portada.png", mimeType: "image/png", buffer: PNG_1X1 });
    await expect(page.getByText("Portada actualizada.")).toBeVisible();
    // La duena la ve firmada con SU sesion (policy uploads_covers_select_own).
    await expect(page.getByRole("img", { name: /Portada de/ })).toHaveAttribute("src", FIRMADA);

    await pub.goto(CATALOGO_TAROT);
    await expect(cardImg(pub)).toHaveAttribute("src", FIRMADA);
    const primera = await cardImg(pub).getAttribute("src");
    // La URL firmada abre de verdad, sin sesion: es una imagen, no un 4xx.
    const img = await request.get(primera!);
    expect(img.status()).toBe(200);
    expect(img.headers()["content-type"]).toMatch(/image\/png/);
    await pub.goto(`/cursos/${SLUG}`);
    await expect(pub.getByRole("img", { name: /Portada del curso/ })).toHaveAttribute("src", FIRMADA);

    // Reemplazar: otra URL, y la anterior ya no abre (el objeto viejo se borro).
    await subir(page, { name: "otra.png", mimeType: "image/png", buffer: PNG_1X1 });
    await expect(page.getByText("Portada actualizada.")).toBeVisible();
    await pub.goto(CATALOGO_TAROT);
    await expect(cardImg(pub)).toHaveAttribute("src", FIRMADA);
    const segunda = await cardImg(pub).getAttribute("src");
    expect(segunda).not.toBe(primera);
    expect((await request.get(primera!)).status()).toBeGreaterThanOrEqual(400);

    // Quitar: vuelve el degradado, sin <img> en la card ni en la cabecera (c.3).
    await page.getByRole("button", { name: "Quitar portada" }).click();
    await expect(page.getByText("Portada quitada.")).toBeVisible();
    await pub.goto(CATALOGO_TAROT);
    await expect(pub.locator(`a[href="/cursos/${SLUG}"]`)).toBeVisible();
    await expect(cardImg(pub)).toHaveCount(0);
    await pub.goto(`/cursos/${SLUG}`);
    await expect(pub.getByRole("img", { name: /Portada del curso/ })).toHaveCount(0);
  } finally {
    await anon.close();
  }
});

test("c.2 · un PDF renombrado .png y un archivo de 3,1 MB se rechazan con mensaje", async ({ page, request }) => {
  await assertStackUp(request);
  await loginDocente(page);
  await abrirEditor(page);
  await subir(page, { name: "truco.png", mimeType: "image/png", buffer: Buffer.from("%PDF-1.7\n") });
  await expect(page.getByText(/JPG, PNG o WEBP/)).toBeVisible();

  const grande = Buffer.alloc(Math.ceil(3.1 * 1024 * 1024));
  PNG_1X1.copy(grande, 0, 0, 8);
  await page.getByLabel(/Elegir portada/).setInputFiles({ name: "grande.png", mimeType: "image/png", buffer: grande });
  // El aviso temprano del cliente aparece y el boton queda deshabilitado: no se manda nada.
  await expect(page.getByText(/pesa más de 3 MB/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Subir portada" })).toBeDisabled();
});
