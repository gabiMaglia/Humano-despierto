import { expect, test, ALUMNA, DELFINA, SOL, assertStackUp, login, loginAs } from "./fixtures";
import { messagesWithSubject } from "./mailpit";
import { psql } from "./db";

// T-031 · la docente publica → la inscripta lo ve en la ficha y en /panel → Mailpit tiene un mail
// por inscripta activa. El título lleva marca de tiempo porque Mailpit es compartido; el anuncio y
// sus filas de mail_log se borran al final como postgres (el guard deja pasar al servidor).
test("la docente publica: la inscripta lo ve en la ficha y en /panel, y cada inscripta recibe un mail", async ({
  browser,
  request,
}) => {
  test.setTimeout(120_000);
  await assertStackUp(request);
  const title = `Luna nueva en el curso ${Date.now()}`;
  const body = "El jueves repasamos la cruz celta. Traigan el mazo.";
  const slug = ALUMNA.enrolledSlug;

  try {
    const solCtx = await browser.newContext();
    const sol = await solCtx.newPage();
    await loginAs(sol, SOL, "/panel/docente");
    await sol.goto("/panel/docente/anuncios");
    await sol.getByRole("link", { name: new RegExp(`/cursos/${slug}`) }).click();
    await expect(sol).toHaveURL(/\/panel\/docente\/anuncios\?curso=/);

    const nuevo = sol.getByRole("region", { name: "Nuevo anuncio" });
    await nuevo.getByLabel("Título del anuncio").fill(title);
    await nuevo.getByLabel("Texto del anuncio").fill(body);
    await nuevo.getByRole("button", { name: "Guardar borrador" }).click();

    const borrador = sol.getByRole("article", { name: title });
    await expect(borrador).toBeVisible();

    // Borrador: todavía nadie lo ve.
    const alumnaCtx = await browser.newContext();
    const alumna = await alumnaCtx.newPage();
    await login(alumna, ALUMNA);
    await alumna.goto(`/cursos/${slug}`);
    await expect(alumna.getByText(title)).toHaveCount(0);

    // Las destinatarias se miden en vivo, justo antes de publicar: el stack es compartido.
    const inscriptas = psql(
      `select u.email from public.enrollments e join auth.users u on u.id = e.user_id
         join public.courses c on c.id = e.course_id
        where c.slug = '${slug}' and e.status = 'active' and e.user_id <> c.teacher_id order by 1`,
    )
      .split("\n")
      .filter(Boolean);
    expect(inscriptas).toContain(ALUMNA.email);

    await borrador.getByRole("button", { name: "Publicar y enviar por mail" }).click();
    await expect(sol.getByRole("region", { name: "Publicados" }).getByRole("article", { name: title })).toBeVisible();

    await alumna.reload();
    await expect(alumna.getByRole("region", { name: "Anuncios" }).getByRole("heading", { name: title })).toBeVisible();
    await alumna.goto("/panel");
    await expect(
      alumna.getByRole("region", { name: "Novedades de tus cursos" }).getByRole("heading", { name: title }),
    ).toBeVisible();

    // c.10: sin sesión la ficha no tiene la sección.
    const anonCtx = await browser.newContext();
    const anon = await anonCtx.newPage();
    await anon.goto(`/cursos/${slug}`);
    await expect(anon.getByRole("region", { name: "Anuncios" })).toHaveCount(0);
    await expect(anon.getByText(title)).toHaveCount(0);

    // c.4: un mail por inscripta, ni uno más, ninguno a la autora. El envío corre en after(): se espera.
    await expect
      .poll(async () => (await messagesWithSubject(request, title)).length, {
        timeout: 45_000,
        message: `no llegaron ${inscriptas.length} mails del anuncio a Mailpit`,
      })
      .toBe(inscriptas.length);
    const destinatarias = (await messagesWithSubject(request, title)).flatMap((m) => m.To.map((t) => t.Address)).sort();
    expect(destinatarias).toEqual([...inscriptas].sort());
    expect(destinatarias).not.toContain(SOL.email);

    // c.4 en la base: una fila de mail_log por inscripta, todas confirmadas.
    const filas = psql(
      `select count(*) || '/' || count(sent_at) from public.mail_log l join public.course_announcements a
         on l.scope_key = a.id::text where l.mail_type = 'course_announcement' and a.title = '${title}'`,
    );
    expect(filas).toBe(`${inscriptas.length}/${inscriptas.length}`);

    await Promise.all([solCtx.close(), alumnaCtx.close(), anonCtx.close()]);
  } finally {
    psql(
      `delete from public.mail_log where mail_type = 'course_announcement' and scope_key in
         (select id::text from public.course_announcements where title = '${title}');
       delete from public.course_announcements where title = '${title}';`,
    );
  }
});

test("c.8: un curso sin anuncios publicados no dibuja la sección (sin 'aún no hay anuncios')", async ({ page, request }) => {
  await assertStackUp(request);
  await login(page, DELFINA);
  await page.goto(`/cursos/${DELFINA.enrolledSlug}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("region", { name: "Anuncios" })).toHaveCount(0);
  await expect(page.getByText(/aún no hay anuncios/i)).toHaveCount(0);
});
