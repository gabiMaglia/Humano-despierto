import type { Page } from "@playwright/test";
import { ADMIN, SOL, assertStackUp, expect, loginAs, test, userIdByEmail } from "./fixtures";
import { psql } from "./db";

// D-105 · lo que la paridad de formularios del rediseño sólo verificó comparando campos.
// Todo lo que crean estos tests es propio: un curso en borrador (nunca público), un usuario
// descartable y un anuncio dentro de ese curso. El afterAll lo borra aunque el test falle.
try {
  process.loadEnvFile(".env.local");
} catch {
  // Sin archivo: el skip de abajo lo dice.
}
const SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const H = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };

const STAMP = Date.now();
const SLUG = `e2e-d105-${STAMP}`;
const TITULO = `Curso e2e ${STAMP}`;
const TITULO_EDITADO = `Curso e2e editado ${STAMP}`;
const SLUG_ANUNCIO = `e2e-d105-anuncio-${STAMP}`;
const MAIL_ROL = `e2e-rol-${STAMP}@test.local`;

test.beforeAll(() => {
  test.skip(!SERVICE, "falta SUPABASE_SERVICE_ROLE_KEY (webApp/.env.local)");
});

test.afterAll(async ({ request }) => {
  psql(`delete from public.courses where slug in ('${SLUG}', '${SLUG_ANUNCIO}')`);
  if (!SERVICE) return;
  const res = await request.get(`${SUPABASE}/auth/v1/admin/users`, { headers: H, params: { filter: MAIL_ROL } });
  const user = ((await res.json()).users as { id: string; email: string }[]).find((u) => u.email === MAIL_ROL);
  if (user) await request.delete(`${SUPABASE}/auth/v1/admin/users/${user.id}`, { headers: H });
});

async function loginDocente(page: Page): Promise<void> {
  await loginAs(page, SOL, "/panel/docente");
}

test("crear curso, editarlo, armar módulo y lección, editar recursos y capítulos, y borrarlo tipeando el nombre", async ({
  page,
  request,
}) => {
  test.setTimeout(180_000);
  await assertStackUp(request);
  await loginDocente(page);

  // Crear: nace en borrador y redirige al editor. No manda numeral romano (D-65 / T-080).
  await page.goto("/panel/docente/nuevo", { waitUntil: "networkidle" });
  await page.getByLabel("Slug (URL)").fill(SLUG);
  await page.getByLabel("Título", { exact: true }).fill(TITULO);
  await page.getByLabel("Disciplina").fill("Tarot");
  await page.getByLabel("Nivel").fill("Iniciación");
  await page.getByLabel("Precio").fill("240");
  await page.getByRole("button", { name: "Crear curso" }).click();
  await expect(page).toHaveURL(/\/panel\/docente\/cursos\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1, name: TITULO })).toBeVisible();
  expect(psql(`select status from public.courses where slug = '${SLUG}'`)).toBe("draft");
  const courseUrl = page.url();

  // Editar.
  await page.getByLabel("Título", { exact: true }).fill(TITULO_EDITADO);
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Curso actualizado.")).toBeVisible();
  expect(psql(`select title from public.courses where slug = '${SLUG}'`)).toBe(TITULO_EDITADO);

  // Módulo y lección.
  await page.getByLabel("Nuevo módulo").fill("Módulo uno");
  await page.getByRole("button", { name: "+ Módulo" }).click();
  const modulo = page.getByRole("region", { name: "Módulo Módulo uno" });
  await expect(modulo).toBeVisible();
  await modulo.getByLabel("Nueva lección").fill("Lección uno");
  await modulo.getByRole("button", { name: "+ Lección" }).click();
  await modulo.getByRole("link", { name: "Lección uno" }).click();
  await expect(page).toHaveURL(/\/lecciones\/[0-9a-f-]{36}$/);

  // Recursos: alta, edición y baja.
  const recursos = page.getByRole("region", { name: "Recursos (Drive)" });
  await recursos.getByLabel("Nombre").fill("Guía inicial");
  await recursos.getByLabel("Link de Drive").fill("https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view");
  await recursos.getByRole("button", { name: "+ Recurso" }).click();
  await expect(recursos.getByText("Guía inicial")).toBeVisible();

  await recursos.getByRole("button", { name: "Editar" }).click();
  await recursos.getByLabel("Nombre").first().fill("Guía renombrada");
  await recursos.getByLabel("Tamaño").first().fill("1.2 MB");
  await recursos.getByRole("button", { name: "Guardar" }).click();
  await expect
    .poll(() =>
      psql(`select name || '|' || coalesce(size_label, '') from public.lesson_resources r join public.courses c on c.id = r.course_id where c.slug = '${SLUG}'`),
    )
    .toBe("Guía renombrada|1.2 MB");
  // El formulario de edición queda abierto tras guardar: se cierra para ver la fila.
  await recursos.getByRole("button", { name: "Cancelar" }).click();
  await expect(recursos.getByText("Guía renombrada")).toBeVisible();
  await expect(recursos.getByText("1.2 MB")).toBeVisible();

  await recursos.getByRole("button", { name: "Borrar" }).click();
  await expect(recursos.getByText("Sin recursos todavía.")).toBeVisible();

  // Capítulos: alta, edición (minuto y etiqueta) y baja.
  const capitulos = page.getByRole("region", { name: "Capítulos" });
  await capitulos.getByLabel("Minuto").fill("1:30");
  await capitulos.getByLabel("Etiqueta del capítulo").fill("Presentación");
  await capitulos.getByRole("button", { name: "+ Capítulo" }).click();
  await expect(capitulos.getByText("Presentación")).toBeVisible();
  await expect(capitulos.getByText("1:30")).toBeVisible();

  await capitulos.getByRole("button", { name: "Editar" }).click();
  await capitulos.getByLabel("Minuto").first().fill("2:05");
  await capitulos.getByLabel("Etiqueta", { exact: true }).fill("Presentación y mazo");
  await capitulos.getByRole("button", { name: "Guardar" }).click();
  await expect
    .poll(() => psql(`select start_seconds from public.lesson_chapters ch join public.courses c on c.id = ch.course_id where c.slug = '${SLUG}'`))
    .toBe("125");
  await capitulos.getByRole("button", { name: "Cancelar" }).click();
  await expect(capitulos.getByText("Presentación y mazo")).toBeVisible();
  await expect(capitulos.getByText("2:05")).toBeVisible();

  await capitulos.getByRole("button", { name: "Borrar" }).click();
  await expect(capitulos.getByText("Sin capítulos todavía.")).toBeVisible();

  // Borrado por tipeo: el botón sigue apagado con un nombre casi igual y se enciende con el exacto.
  await page.goto(courseUrl, { waitUntil: "networkidle" });
  const zona = page.getByRole("region", { name: "Zona de peligro" });
  const borrar = zona.getByRole("button", { name: "Borrar curso" });
  await expect(borrar).toBeDisabled();
  await zona.getByLabel(/Escribí/).fill(TITULO);
  await expect(borrar).toBeDisabled();
  await zona.getByLabel(/Escribí/).fill(TITULO_EDITADO);
  await expect(borrar).toBeEnabled();
  await borrar.click();
  await expect(page).toHaveURL(/\/panel\/docente$/);
  expect(psql(`select count(*) from public.courses where slug = '${SLUG}'`)).toBe("0");
});

test("la docente retira un anuncio publicado con motivo y queda en Retirados", async ({ page, request }) => {
  await assertStackUp(request);
  const titulo = `Anuncio e2e ${STAMP}`;
  // Curso y anuncio propios sembrados como postgres: publicar por la UI manda mails y no es lo que se prueba acá.
  const courseId = psql(
    `insert into public.courses (slug, title, discipline, level, teacher_id)
     values ('${SLUG_ANUNCIO}', 'Curso de anuncio e2e ${STAMP}', 'Tarot', 'Iniciación', 'a0000000-0000-4000-8000-000000000002')
     returning id`,
  ).split("\n")[0];
  psql(
    `insert into public.course_announcements (course_id, author_id, title, body, status, published_at)
     values ('${courseId}', 'a0000000-0000-4000-8000-000000000002', '${titulo}', 'Texto del anuncio e2e.', 'published', now())`,
  );

  await loginDocente(page);
  await page.goto(`/panel/docente/anuncios?curso=${courseId}`, { waitUntil: "networkidle" });
  const articulo = page.getByRole("article", { name: titulo });
  await articulo.getByRole("button", { name: "Retirar" }).click();
  await articulo.getByLabel("Motivo").fill("Se publicó por error");
  await articulo.getByRole("button", { name: "Retirar", exact: true }).last().click();

  await expect(page.getByRole("heading", { name: "Retirados" })).toBeVisible();
  await expect(page.getByText("motivo: “Se publicó por error”")).toBeVisible();
  expect(psql(`select deleted_reason from public.course_announcements where title = '${titulo}'`)).toBe("Se publicó por error");
});

test("el admin cambia el rol de una usuaria y queda en profiles", async ({ page, request }) => {
  await assertStackUp(request);
  const created = await request.post(`${SUPABASE}/auth/v1/admin/users`, {
    headers: H,
    data: { email: MAIL_ROL, password: "clave-e2e-1", email_confirm: true, user_metadata: { full_name: "Rol E2E" } },
  });
  expect(created.ok(), await created.text()).toBe(true);
  const uid = await userIdByEmail(request, MAIL_ROL);
  expect(psql(`select role from public.profiles where id = '${uid}'`)).toBe("student");

  await loginAs(page, ADMIN, "/panel/admin");
  await page.goto(`/panel/admin/usuarios?q=${encodeURIComponent(MAIL_ROL)}`, { waitUntil: "networkidle" });
  await page.getByLabel("Rol de Rol E2E").selectOption("teacher");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Rol E2E ahora es teacher.")).toBeVisible();
  expect(psql(`select role from public.profiles where id = '${uid}'`)).toBe("teacher");
});
