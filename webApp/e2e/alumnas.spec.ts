import { expect, test, assertStackUp, loginAs } from "./fixtures";
import { psql } from "./db";

const SOL = { email: "sol.mayor@seed.humano.local", password: "seed-teacher-1234" };
const AURORA = { email: "aurora.violeta@seed.humano.local", password: "seed-teacher-1234" };

const courseId = (slug: string) => psql(`select id from public.courses where slug = '${slug}'`);

test("la docente ve sus alumnas con avance y sin certificado, sin dinero", async ({ page, request }) => {
  await assertStackUp(request);
  await loginAs(page, SOL, "/panel/docente");
  await page.goto(`/panel/docente/cursos/${courseId("tarot-iniciatico")}/alumnas`);

  await expect(page.getByRole("heading", { name: /Alumnas/ })).toBeVisible();
  const bruno = page.getByRole("listitem").filter({ hasText: "Bruno Sasía" });
  await expect(bruno).toContainText("43 %");
  await expect(bruno).toContainText("Sin certificado");
  // la revocada no es inscripta activa
  await expect(page.getByText("Alumna Revocada")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(/\$|ARS|ingresos/i);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.getByRole("link", { name: "tu perfil" })).toHaveAttribute("href", "/panel/perfil");
});

test("curso ajeno da 404 para la docente", async ({ page, request }) => {
  await assertStackUp(request);
  await loginAs(page, SOL, "/panel/docente");
  await page.goto(`/panel/docente/cursos/${courseId("reiki-nivel-1")}/alumnas`);
  // El status HTTP llega 200 porque loading.tsx ya empezó a streamear (igual que el editor del curso);
  // lo que importa es que se renderiza notFound() y ninguna alumna ajena.
  // T-052: la 404 de Next (heading "404") paso a ser la propia del sitio; misma intencion.
  await expect(page.getByText("Este camino no existe")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Delfina");
});

test("alumna con el curso completo: 100 % y link al certificado", async ({ page, request }) => {
  await assertStackUp(request);
  await loginAs(page, AURORA, "/panel/docente");
  await page.goto(`/panel/docente/cursos/${courseId("reiki-nivel-1")}/alumnas`);
  const delfina = page.getByRole("listitem").filter({ hasText: "Delfina" });
  await expect(delfina).toContainText("100 %");
  await expect(delfina.getByRole("link", { name: "Certificado" })).toHaveAttribute("href", /\/certificado\/[0-9a-f]{32}/);
});

test("solicitudes pendientes: conteo sin link al admin y sin bloque de preguntas", async ({ page, request }) => {
  await assertStackUp(request);
  const cid = courseId("tarot-iniciatico");
  const uid = psql("select id from auth.users where email = 'delfina.curso-completo@seed.humano.local'");
  psql(`insert into public.enrollments (user_id, course_id, status) values ('${uid}', '${cid}', 'requested')`);
  try {
    await loginAs(page, SOL, "/panel/docente");
    await page.goto(`/panel/docente/cursos/${cid}/alumnas`);
    await expect(page.getByText("1 pendiente")).toBeVisible();
    // El layout de admin manda a la docente a /panel: un link ahi seria un callejon.
    await expect(page.locator('a[href*="/panel/admin"]')).toHaveCount(0);
    // lesson_questions (T-030) no existe todavia: el bloque se omite, no muestra 0.
    await expect(page.locator("body")).not.toContainText(/pregunta/i);
  } finally {
    psql(`delete from public.enrollments where user_id = '${uid}' and course_id = '${cid}'`);
  }
});
