import { expect, test, type Page } from "@playwright/test";
import { ALUMNA, assertStackUp, login } from "./fixtures";

// Sol Mayor es la docente sembrada con ficha publica y cursos (seed.sql, bloque de docentes).
const SOL = {
  email: "sol.mayor@seed.humano.local",
  password: "seed-teacher-1234",
  slug: "sol-mayor",
  fullName: "Sol Mayor",
};

// `login` de fixtures afirma que se aterriza en /panel; desde T-040 una docente cae en
// /panel/docente, asi que para ella se espera esa ruta.
async function loginDocente(page: Page) {
  await page.goto("/entrar", { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').fill(SOL.email);
  await page.locator('input[type="password"]').fill(SOL.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/panel\/docente$/);
}

async function guardarPerfil(page: Page, campos: { nombre?: string; telefono?: string; fecha?: string }) {
  await page.goto("/panel/perfil", { waitUntil: "networkidle" });
  if (campos.nombre !== undefined) await page.getByLabel("Nombre", { exact: true }).fill(campos.nombre);
  if (campos.telefono !== undefined) await page.getByLabel("Teléfono").fill(campos.telefono);
  if (campos.fecha !== undefined) await page.getByLabel("Fecha de nacimiento").fill(campos.fecha);
  await page.getByRole("button", { name: "Guardar perfil" }).click();
  await expect(page.getByText("Perfil guardado.")).toBeVisible();
}

test("c.1 · la alumna ve su perfil sin rol editable", async ({ page, request }) => {
  await assertStackUp(request);
  await login(page, ALUMNA);
  await page.goto("/panel/perfil");
  await expect(page.locator("h1")).toContainText("perfil");
  for (const label of ["Nombre", "Bio", "Teléfono", "Fecha de nacimiento"]) {
    await expect(page.getByLabel(label, { exact: true })).toBeVisible();
  }
  await expect(page.getByLabel(/rol/i)).toHaveCount(0);
});

test("la docente cambia su nombre y la ficha publica lo muestra", async ({ page, request }) => {
  await assertStackUp(request);
  await loginDocente(page);
  try {
    await guardarPerfil(page, { nombre: "Sol Mayor Prueba" });
    await page.goto(`/guias/${SOL.slug}`);
    await expect(page.locator("h1")).toHaveText("Sol Mayor Prueba");
  } finally {
    await guardarPerfil(page, { nombre: SOL.fullName });
  }
});

test("c.8 · la alumna carga y borra su fecha de nacimiento", async ({ page, request }) => {
  await assertStackUp(request);
  await login(page, ALUMNA);
  await guardarPerfil(page, { fecha: "1990-05-04" });
  await page.reload();
  await expect(page.getByLabel("Fecha de nacimiento")).toHaveValue("1990-05-04");
  await page.getByRole("button", { name: "Borrar fecha" }).click();
  await expect(page.getByText("Fecha de nacimiento borrada.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Fecha de nacimiento")).toHaveValue("");
});
