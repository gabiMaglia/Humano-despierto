import { expect, test, ADMIN, ALUMNA, SOL, assertStackUp, loginAs } from "./fixtures";
import { psql } from "./db";

// T-037 · la guía reporta, el admin oculta, la ficha deja de mostrarla y al desocultar vuelve.
// La reseña se siembra por psql: escribirla desde la ficha es T-028 y no es lo que se prueba acá.
// Se borra antes y después; la cascada se lleva sus reportes, así una corrida que muere a la
// mitad no ensucia la siguiente.
const SLUG = ALUMNA.enrolledSlug;
const ALUMNA_ID = "d0000000-0000-4000-8000-000000000003";
const DE_LA_ALUMNA = `user_id = '${ALUMNA_ID}' and course_id = (select id from public.courses where slug = '${SLUG}')`;

function borrarResena(): void {
  psql(`delete from public.course_reviews where ${DE_LA_ALUMNA};`);
}

test.beforeAll(borrarResena);
test.afterAll(borrarResena);

test("la guía reporta, el admin oculta y la reseña sale de la ficha; al desocultar vuelve", async ({ browser, request }) => {
  await assertStackUp(request);
  const marca = `Reseña de prueba T-037 ${Date.now()}`;
  // 2 estrellas: no puede ser la destacada, así que vive en la lista (<li>).
  psql(
    `insert into public.course_reviews (course_id, user_id, rating, body)
     select id, '${ALUMNA_ID}', 2, '${marca}' from public.courses where slug = '${SLUG}';`,
  );

  // 1 · la guía dueña reporta
  const guia = await browser.newPage();
  await loginAs(guia, SOL, "/panel/docente");
  await guia.goto(`/cursos/${SLUG}`, { waitUntil: "networkidle" });
  const enFicha = guia.locator("li").filter({ hasText: marca });
  await enFicha.getByText("Reportar al admin").click();
  await enFicha.getByLabel("Motivo del reporte").fill("Usa el nombre completo de otra alumna.");
  await enFicha.getByRole("button", { name: "Enviar reporte" }).click();
  await expect(enFicha.getByText("Reportada · en revisión")).toBeVisible();
  // Y en su panel ve el estado, sin quién ni por qué.
  await guia.goto("/panel/docente", { waitUntil: "networkidle" });
  await expect(guia.getByRole("region", { name: "Reseñas que reportaste" })).toContainText("Reportada · en revisión");
  await guia.close();

  // 2 · el admin la ve en la cola con la reseña completa y la oculta
  const admin = await browser.newPage();
  await loginAs(admin, ADMIN, "/panel/admin");
  await admin.goto("/panel/admin/resenas", { waitUntil: "networkidle" });
  const cola = admin.getByRole("region", { name: "Reportes pendientes" });
  const enCola = cola.getByRole("article").filter({ hasText: marca });
  await expect(enCola).toContainText("Usa el nombre completo de otra alumna.");
  await enCola.getByLabel("Motivo para ocultar").fill("Datos personales de una tercera persona.");
  await enCola.getByRole("button", { name: "Ocultar reseña" }).click();
  await expect(cola.getByText(marca)).toHaveCount(0);

  // 3 · sin sesión, la ficha ya no la muestra
  const anon = await browser.newPage();
  await anon.goto(`/cursos/${SLUG}`, { waitUntil: "networkidle" });
  await expect(anon.getByText(marca)).toHaveCount(0);

  // 4 · desocultar la devuelve (SP-4 c.2)
  const enRecientes = admin
    .getByRole("region", { name: "Reseñas recientes" })
    .locator("li")
    .filter({ hasText: marca });
  await expect(enRecientes).toContainText("Oculta · Datos personales de una tercera persona.");
  await enRecientes.getByRole("button", { name: "Volver a mostrar" }).click();
  await expect(enRecientes.getByRole("button", { name: "Ocultar reseña" })).toBeVisible();
  await anon.reload({ waitUntil: "networkidle" });
  await expect(anon.getByText(marca)).toBeVisible();
  await anon.close();
  await admin.close();
});
