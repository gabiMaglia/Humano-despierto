import { expect, test, type APIResponse } from "@playwright/test";
import { ALUMNA, DELFINA, RECURSO, REVOCADA, expectDenied, lessonIdOfResource, login } from "./fixtures";

const DRIVE = "https://drive.google.com/uc?export=download&id=";
// Nunca se sigue el redirect: los fixtures apuntan a placeholders, lo que se prueba es el Location.
const NO_REDIRECT = { maxRedirects: 0 } as const;

function expectRedirect(res: APIResponse, location: string): void {
  expect(res.status()).toBe(302);
  expect(res.headers()["location"]).toBe(location);
  expect(res.headers()["cache-control"]).toBe("private, no-store");
}

test.describe("T-044 · recursos gateados por inscripcion", () => {
  let tarotLesson: string;
  let previewLesson: string;
  let herbarioLesson: string;

  test.beforeAll(async ({ request }) => {
    tarotLesson = await lessonIdOfResource(request, RECURSO.link);
    previewLesson = await lessonIdOfResource(request, RECURSO.preview);
    herbarioLesson = await lessonIdOfResource(request, RECURSO.herbario);
  });

  test("c.1 inscripta: el player linkea el recurso y el handler responde 302 a Drive", async ({ page }) => {
    await login(page, ALUMNA);
    await page.goto(`/leccion/${tarotLesson}`);
    await page.getByRole("tab", { name: /recursos/i }).click();
    const link = page.getByRole("link", { name: "Descargar Mapa de la cruz celta · 10 posiciones" });
    const href = await link.getAttribute("href");
    expect(href).toMatch(new RegExp(`^/leccion/${tarotLesson}/recurso/[0-9a-f-]{36}$`));
    expectRedirect(await page.request.get(href!, NO_REDIRECT), `${DRIVE}SEED_PLACEHOLDER_PDF_1`);
  });

  test("c.2 inscripta: recurso link sin drive_file_id redirige a su url", async ({ page }) => {
    await login(page, ALUMNA);
    const res = await page.request.get(`/leccion/${tarotLesson}/recurso/${RECURSO.link}`, NO_REDIRECT);
    expectRedirect(res, "https://example.org/glosario-arcanos");
  });

  test("c.3 anonima: recurso de leccion preview da 302", async ({ request }) => {
    const res = await request.get(`/leccion/${previewLesson}/recurso/${RECURSO.preview}`, NO_REDIRECT);
    expectRedirect(res, `${DRIVE}SEED_PLACEHOLDER_PREVIEW_1`);
  });

  test("c.4 anonima: recurso de leccion no preview da 403 vacio", async ({ request }) => {
    await expectDenied(await request.get(`/leccion/${tarotLesson}/recurso/${RECURSO.link}`, NO_REDIRECT));
  });

  test("c.5 alumna de otro curso: 403 vacio", async ({ page }) => {
    await login(page, DELFINA);
    await expectDenied(await page.request.get(`/leccion/${tarotLesson}/recurso/${RECURSO.link}`, NO_REDIRECT));
  });

  test("c.6 recurso de B bajo leccion de A, y bajo leccion de B: 403 los dos", async ({ page, request }) => {
    await login(page, ALUMNA);
    // Bajo su leccion la alumna TIENE acceso (c.1/c.2): el unico motivo del 403 es el lesson_id ajeno.
    await expectDenied(await page.request.get(`/leccion/${tarotLesson}/recurso/${RECURSO.herbario}`, NO_REDIRECT));
    await expectDenied(await page.request.get(`/leccion/${herbarioLesson}/recurso/${RECURSO.herbario}`, NO_REDIRECT));
    // Preview abre la leccion a cualquiera (c.3); no abre recursos de otra leccion.
    await expectDenied(await request.get(`/leccion/${previewLesson}/recurso/${RECURSO.herbario}`, NO_REDIRECT));
  });

  test("c.7 inscripcion revocada: 403 vacio", async ({ page }) => {
    await login(page, REVOCADA);
    await expectDenied(await page.request.get(`/leccion/${tarotLesson}/recurso/${RECURSO.link}`, NO_REDIRECT));
  });

  test("c.8 resourceId inexistente o malformado: 403 vacio, sin traza", async ({ page }) => {
    await login(page, ALUMNA);
    for (const path of [
      `/leccion/${tarotLesson}/recurso/00000000-0000-4000-8000-000000000000`,
      `/leccion/${tarotLesson}/recurso/no-es-un-uuid`,
      `/leccion/${tarotLesson}/recurso/${RECURSO.link}'%20or%201=1`,
      `/leccion/no-es-un-uuid/recurso/${RECURSO.link}`,
    ]) {
      await expectDenied(await page.request.get(path, NO_REDIRECT));
    }
  });

  test("c.10 el HTML del player no trae ningun localizador", async ({ page }) => {
    await login(page, ALUMNA);
    const res = await page.request.get(`/leccion/${tarotLesson}`);
    const html = await res.text();
    // Precondicion: es la pagina correcta y trae los recursos (si no, el negativo seria vacuo).
    expect(html).toContain("Mapa de la cruz celta");
    expect(html).toContain("Glosario de arcanos en línea");
    for (const leak of ["SEED_PLACEHOLDER_PDF_1", "drive.google.com", "drive_file_id", "example.org/glosario-arcanos"]) {
      expect(html, `el HTML filtra ${leak}`).not.toContain(leak);
    }
  });
});
