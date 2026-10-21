# SP-4 · Docente y admin completos

**Fecha:** 2026-10-21 · **Maestro:** `2026-10-21-cierre-funcional-master.md` (D1, S-A, S-D, R-1..R-14)
**Depende de:** SP-1 (T-042 crea el bucket `uploads` y `/panel/perfil`) y SP-2 (T-043 crea la cola de
solicitudes). **Paralelizable con:** SP-5 sólo si los archivos son disjuntos (P-24).
**Orden interno:** T-047 → T-048 → T-037 → T-049.

No se vuelve a decidir: portada raster (S-A), un solo bucket privado (S-D), pagos fuera (D1), quién
modera qué (ADR-012). Cada ticket cita la policy o el guard que lo defiende; una afirmación de
seguridad sin ataque en `b1-postgrest-attacks.sh` no está probada (R-6).

---

## T-047 · Portada de curso

**Agente:** `nerv-web` + `nerv-arquitecto` · **Nivel:** Strong (migración, Storage, permisos) ·
**Depende de:** T-042 · **Migración:** `20261021150000_0026_course_cover.sql`

### Por qué
El catálogo y la ficha son la página de venta y hoy todas las cards son el mismo degradé. S-A ya
decidió que lo subido por usuarias puede ser raster. Junto con el avatar de T-042 es la única
excepción al "sin raster" de CLAUDE.md; no habilita ningún otro `<img>`.

### Migración
- `courses.cover_path text` con CHECK de forma y pertenencia:
  `cover_path is null or cover_path ~ ('^covers/' || id::text || '/[A-Za-z0-9_-]{1,64}\.(jpg|jpeg|png|webp)$')`.
  El id del curso va en el path y el CHECK lo ata a la fila. La forma cerrada hace innecesario
  ADR-009 sobre esta columna.
- Grants (R-1): `select (cover_path)` a `anon, authenticated`; `update (cover_path)` a
  `authenticated` (la fila la decide `courses_update_own`). Sin `insert`: el path necesita el id.
- Policies en `storage.objects`, bucket `uploads`, prefijo `covers/`: `insert`, `update`, `delete`
  sólo si `public.owns_course((storage.foldername(name))[2]::uuid)`. **Sin `select` para
  clientes**: el bucket es privado (S-D) y `<img>` no manda `apikey`; la lectura pública sale del
  route handler de abajo, que es la "transformación pública según el caso" de S-D.

### Qué se toca
- `panel/docente/cursos/[courseId]/actions.ts`: `uploadCourseCoverAction` y
  `removeCourseCoverAction`. Validación en el servidor por magic bytes (no por extensión ni
  `file.type`), tope 3 MB, jpeg/png/webp. Sube con el cliente de sesión a
  `covers/<course_id>/<uuid>.<ext>`, luego `update cover_path`, luego borra el objeto anterior. Si
  el `update` falla, borra lo recién subido. Recorte y resize no son obligatorios.
- Route handler `GET /cursos/[slug]/portada`: si el curso está publicado, o quien pide es la dueña o
  admin, descarga por `service_role` y responde con `Content-Type` real, `Cache-Control: public,
  max-age=3600, stale-while-revalidate=86400` y `ETag` derivado de `cover_path`. Si no: 404. Nunca
  acepta un path del request: resuelve `slug → id → cover_path` en el servidor.
- `CourseCard` gana `coverUrl?: string`: `<img src alt="" loading="lazy">` con `object-cover` en el
  contenedor `aspect-[4/3]`; sin valor, el degradé actual. La ficha igual en su cabecera.
  `generateMetadata` agrega `openGraph.images` sólo si hay portada; el OG sin portada es de T-052.

### Criterios
1. Dado un curso propio, cuando la docente sube un jpeg de 2 MB, entonces card, ficha y OG muestran
   esa imagen y `cover_path` cumple el CHECK.
2. Dado un archivo de 3,1 MB, o un PDF renombrado `.png`, entonces el Server Action lo rechaza con
   mensaje claro y Storage no recibe nada.
3. Dado un curso sin portada, entonces card y ficha muestran el SVG generativo actual.
4. Dada una docente que no es la dueña, una alumna o `anon`, cuando suben a `covers/<curso_ajeno>/`
   por HTTP, entonces 403 (R-6).
5. Dado un `update cover_path = 'covers/<otro_id>/x.png'`, entonces el CHECK lo rechaza.
6. Dado un curso en borrador con portada, cuando `anon` pide `/cursos/<slug>/portada`, entonces 404;
   la dueña logueada, 200.
7. Dado que reemplaza la portada, entonces el objeto anterior desaparece del bucket.

### Cómo se verifica
`npm test`: CHECK y grants por columna; el baseline de PGlite no trae `storage`, así que las
policies del bucket se prueban sólo en B-1: criterios 4 y 6. Playwright (R-14): subir, ver en card, reemplazar, quitar. `check-seo.sh` sobre la ficha con
portada: `og:image` presente y resoluble.

### Riesgo
Una lectura por `service_role` en ruta pública, acotada a un objeto cuyo path salió de una fila que
`courses_read` ya mostraría. Si T-052 trae CSP, `img-src 'self'` alcanza.

---

## T-048 · Alumnas y métricas por curso

**Agente:** `nerv-web` · **Nivel:** Advisory · **Depende de:** T-043, T-028 (hecho), T-042 ·
**Sin migración** · **Absorbe T-025 y T-034** (paridad §T-034)

### Por qué
El panel docente es "tus cursos" (`panel/docente/page.tsx`). T-025 pidió "toda la info pertinente"
y T-034 la acotó a lo que convierte un panel en herramienta: quién está, cómo avanza, qué falta
responder. Con D1 vigente no hay ingresos y no se dibuja el lugar (T-025 c.4, T-034 c.6).

### Qué se toca
- Ruta nueva `/panel/docente/cursos/[courseId]/alumnas` (Server Component, `noindex`, R-11).
  `assertOwnsCourse` primero; curso ajeno o inexistente da `notFound()`, misma respuesta.
- `lib/server/teacher-metrics.ts` (`server-only`): `getCourseRoster(courseId, teacherId)`.
  Inscriptas por sesión: `enrollments_read` (0004 ~107) incluye `owns_course`. Progreso y
  certificados **no**: `lesson_progress_read_own` (0004 ~112) y `certificates_read_own` (0013 ~194)
  devuelven sólo filas propias, así que van por `service_role` recién después de `assertOwnsCourse`,
  el patrón de `getTeacherLessonDetail`. Sólo las columnas que la página muestra.
- Progreso % = lecciones publicadas con `lesson_progress.completed = true` / lecciones publicadas
  (`lessons.is_published`). `completed` es derivada (ADR-007). Es la fórmula de
  `enrollment.ts::progressPercent`: se extrae a `lib/utils/progress.ts` con test Vitest y la usan los dos.
- Cabecera, todo derivado por consulta (T-025 c.1): inscriptas activas · solicitudes pendientes
  (tabla de T-043, con link a la cola) · completadas (certificado emitido) · rating promedio y
  cantidad (reusa `getCourseReviews`, que ya excluye ocultas) · preguntas sin responder: consulta
  `lesson_questions` (T-030) y si el error es `42P01` el bloque entero se omite, no muestra 0.
- Filas: nombre, fecha de inscripción, progreso %, certificado sí/no con link. **No** se muestra
  qué lección vio ni cuándo (T-034 c.5); el detalle por lección es agregado, "x de y completaron la
  lección n", en una segunda tabla.
- `cursos/[courseId]/page.tsx` enlaza a `alumnas` con los dos números principales. Sección "Datos
  básicos" del panel docente (nombre, bio, avatar): link a `/panel/perfil` de T-042, no otro formulario.

### Criterios
1. Dado un curso de 10 lecciones publicadas y una alumna con 9 completadas, entonces 90 % y "sin
   certificado"; con 10, 100 % y el link al certificado.
2. Dado un curso con 0 inscriptas, entonces la página dice algo con sentido, no una grilla vacía ni
   `0 %` sueltos (T-025 c.3).
3. Dado un curso con una lección en borrador, entonces esa lección no cuenta en el denominador.
4. Dada una docente que pide `/panel/docente/cursos/<ajeno>/alumnas`, entonces 404. Por PostgREST,
   `select` sobre `lesson_progress` o `certificates` ajenos devuelve 0 filas; entra al harness
   bajo T-048 aunque el schema ya lo cumpla (R-6).
5. Dado que T-030 no corrió, entonces no hay bloque de preguntas; dado que corrió y hay 3 sin
   respuesta, entonces "3 preguntas sin responder" con link.
6. Dado el panel, entonces no aparece ninguna cifra de dinero ni un lugar reservado para ella.
7. Dado que una inscripción pasa a `revoked`, entonces sale de activas y deja de contar.

### Cómo se verifica
Vitest sobre el helper (0/0, borrador excluido, redondeo). `npm test` y B-1: criterio 4.
Playwright: `sol.mayor` ve a `delfina.curso-completo` al 100 % con certificado. `check-seo.sh`:
la ruta es `noindex`.

### Riesgo
Primera lectura por `service_role` de datos de alumnas hacia una docente. Un `select *` acá es la
fuga lenta que T-034 c.5 avisó; el recorte de columnas es parte del criterio, no una sugerencia.

---

## T-037 · Moderación de reseñas

**Agente:** `nerv-web` + `nerv-arquitecto` · **Nivel:** Strong · **ADR-012** ·
**Spec de base:** `2026-09-10-adr-012-quien-modera-que.md` (tabla, RLS, criterios 1 a 10) y ficha
`### T-037` del backlog · **Migración:** `20261021160000_0027_course_review_reports.sql`

### Por qué
La migración `course_review_reports` de ADR-012 se escribió y nunca corrió (no hay archivo en
`migrations/`). Acá no se reescribe: se aplica tal cual y se agrega la UI de admin y los Server
Actions de ocultar. Ya decidido y sólo citado: reporta la guía dueña o el admin, no la alumna;
oculta sólo el admin por `service_role` (guard 3 de 0024 ~150); sin mail al admin.

### Qué se toca
- Migración: tabla y policies de la spec de ADR-012 más `revoke execute` final. Test del
  `on delete cascade` desde `course_reviews` (ADR-011 pregunta 1).
- `lib/server/reviews-admin.ts` y `panel/admin/actions.ts`: `hideReviewAction(reviewId, reason,
  reportId?)` y `unhideReviewAction(reviewId)`, ambos `requireAdmin` + `service_role`. `hide`
  escribe el trío `hidden_*` (R-5) y resuelve los reportes pendientes de esa reseña con `'oculta'`;
  `unhide` pone el trío en null sin tocar reportes resueltos. `dismissReportAction` resuelve con
  `'desestimada'`. Motivo obligatorio, 1 a 1000 caracteres.
- `reportReviewAction` en la ficha, con cliente de sesión: la policy de ADR-012 decide. Botón visible
  sólo si `owns_course` o admin.
- Ruta `/panel/admin/resenas` (`noindex`): cola de reportes pendientes con la reseña completa, curso,
  quién reportó y motivo; debajo, las 50 reseñas más recientes, con las ocultas marcadas. Cola vacía
  se ve deliberada (ADR-012 c.9). Si T-043 ya creó sub-navegación en el admin, se reusa; si no, se
  crea `AdminTabs` con el patrón de `PanelTabs` y T-049 la extiende.
- Panel docente: en `alumnas` (T-048) un bloque con el estado de cada reporte propio: pendiente,
  oculta o desestimada. Sin `resolved_by` ni motivo interno.

### Criterios
1. Dado un reporte pendiente, cuando el admin oculta con motivo, entonces la reseña deja de salir en
   la ficha (`course_reviews_read` filtra `hidden_at is null`), deja de contar en `getCourseReviews`
   y por lo tanto en R-01, y el reporte queda `'oculta'`.
2. Dado que el admin desoculta, entonces vuelve a la ficha y al rating; los reportes resueltos no cambian.
3. Dado un `hide` con motivo en blanco, entonces se rechaza en el Server Action y, si lo esquivara,
   en `course_reviews_hidden_consistency`.
4. Dada la guía dueña, cuando hace `PATCH hidden_at` por PostgREST, entonces 42501 (guard 3 de 0024).
   Dada una alumna que reporta, 42501. Los cuatro ataques de ADR-012 c.8 entran al harness bajo T-037.
5. Dado un reporte sobre una reseña que la alumna borra, entonces el reporte desaparece y el borrado
   no queda bloqueado (ADR-012 c.7).
6. Dados `hide` y `unhide` concurrentes, entonces el trío va junto o no va (R-5), sin estado intermedio.

### Cómo se verifica
`npm test`: tabla, RLS, cascada, un caso por trigger nuevo (`guard-reachability.test.mjs` lo
exige). B-1: ADR-012 c.8. Playwright: reportar como docente, ocultar como admin, comprobar que la
ficha y `/cursos` ya no la muestran.

### Riesgo
Ocultar desde un reporte y ocultar directo desde la lista son el mismo Server Action con `reportId`
opcional. Un segundo código que escriba `hidden_*` es un segundo lugar donde equivocarse (ADR-012 c.6).

---

## T-049 · Invitación de docentes, búsqueda y paginación en admin

**Agente:** `nerv-web` + `nerv-arquitecto` · **Nivel:** Strong (auth, PII, roles, migración) ·
**Depende de:** T-040 (`?next=`), T-042 · **Migración:** `20261021170000_0028_teacher_invitations.sql`

### Por qué
Hoy una docente nueva se registra como alumna y avisa para que el admin le cambie el rol desde
`updateUserRoleAction` (`panel/admin/actions.ts` 28-83). Y el admin carga las tres listas enteras
(`page.tsx` 9-13) sin búsqueda: con cien alumnas es inusable.

### Migración
```sql
create table public.teacher_invitations (
  id          uuid primary key default gen_random_uuid(),
  email       text not null check (email = lower(btrim(email)) and position('@' in email) > 1),
  token_hash  text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  invited_by  uuid not null references public.profiles (id) on delete restrict,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id) on delete set null,
  revoked_at  timestamptz,
  revoked_by  uuid references public.profiles (id) on delete set null,
  constraint teacher_invitations_accept_consistency check ((accepted_at is null) = (accepted_by is null)),
  constraint teacher_invitations_revoke_consistency check ((revoked_at is null) = (revoked_by is null)),
  constraint teacher_invitations_one_outcome check (accepted_at is null or revoked_at is null)
);
create unique index teacher_invitations_pending_email
  on public.teacher_invitations (email) where accepted_at is null and revoked_at is null;
```
- RLS habilitada **sin policies** y `revoke all` a `anon, authenticated`, como `mail_log`. El token
  en claro nunca se guarda: `sha256` hex de 32 bytes aleatorios en base64url, que va sólo en el mail.
- Guard `guard_teacher_invitations` (ADR-011, R-7): rechaza toda escritura fuera de
  `is_service_context()`; en UPDATE congela `email`, `token_hash`, `invited_by`, `expires_at`; no
  permite `accepted_at` si `expires_at <= now()` o si `revoked_at` no es null.
- `accept_teacher_invitation(p_token_hash text, p_user_id uuid) returns boolean`, `security
  definer`, `execute` sólo a `service_role`. Atómica: busca la fila pendiente y vigente, compara
  `email` con `lower(auth.users.email)` del usuario **y exige `email_confirmed_at` no nulo** (D8),
  marca `accepted_*` y hace `update profiles set role = 'teacher' where id = p_user_id and role =
  'student'` (un admin no se degrada por aceptar). Devuelve `false` sin tocar nada si algo no cuadra:
  no distingue "ajeno", "vencido" ni "inexistente".
- Listados del admin, `security definer`, `execute` sólo a `service_role`, keyset sobre
  `(created_at desc, id desc)`, `limit` 25: `admin_list_users(q, after_at, after_id)` (join
  `profiles` + `auth.users.email`, `ilike` sobre nombre y mail: el mail no está en `profiles` y
  `listAllUsers` hoy lo junta en memoria), `admin_list_courses` (título, slug, docente),
  `admin_list_enrollments` (alumna por nombre o mail, título del curso).

### Qué se toca
- `panel/admin/actions.ts`: `inviteTeacherAction(email)` genera el token, inserta por `service_role`,
  manda `teacher-invitation` y nunca falla por el mail (lección T-020). `revokeInvitationAction(id)`.
  Reenviar es revocar y crear una fila nueva: el token viejo muere.
- Template `mail/templates/teacher-invitation.ts` con el `layout.ts` de los cuatro existentes.
  **Excepción declarada a R-12:** `mail_log` exige `recipient_user_id` de `profiles` y la invitada
  puede no tener cuenta. La idempotencia vive en la fila de invitación (una fila, un envío; el
  índice parcial impide dos pendientes por mail). Si el mail ya tiene cuenta se registra además en
  `mail_log` con `mail_type = 'teacher_invitation'`, agregado al CHECK de 0019 en esta migración.
  El PO puede vetar la excepción en la revisión del spec.
- Enlace del mail: `/entrar?invite=<token>`. `entrar/page.tsx` lo traduce a
  `next=/invitacion/<token>` (T-040), así password, registro y Google (T-041) terminan igual. El
  login es cliente (`signInWithPassword` en `entrar/page.tsx:67`): la aceptación corre después.
- Ruta `/invitacion/[token]` (Server Component, `noindex`): sin sesión, redirige a
  `/entrar?next=/invitacion/<token>`; con sesión, llama `accept_teacher_invitation` por
  `service_role` y redirige a `/panel/docente` si aceptó, o muestra "esta invitación no es válida o
  venció". Nada corre desde el cliente (R-2, ADR-006).
- Admin: `/panel/admin` se parte en pestañas (`AdminTabs` de T-037): usuarios, cursos,
  inscripciones, reseñas, invitaciones. Cada lista lee `?q=&after=` de `searchParams`, llama a su
  función y renderiza "siguiente" con el cursor de la última fila (`created_at|id` en base64url).
  Sin "anterior": el botón de atrás alcanza. `listAllUsers`, `listAllCourses` y
  `listAllEnrollments` se reemplazan; `EnrollmentGrantForm` deja de recibir listas enteras.
- `/panel/admin/invitaciones`: pendientes con vencimiento, aceptadas, revocadas; botón de revocar.

### Criterios
1. Dado un admin que invita a `nueva@mail`, entonces hay una fila pendiente, sale el mail y la
   pantalla dice "invitación enviada, vence el <fecha>".
2. Dada la invitada que se registra con ese mail y confirma, cuando llega a `/invitacion/<token>`,
   entonces su rol es `teacher`, `accepted_*` quedó escrito y ve `/panel/docente`.
3. Dado un usuario con otro mail que usa ese token, entonces ningún rol cambia y la invitación sigue
   pendiente (R-6: token ajeno).
4. Dado un token vencido, revocado o ya aceptado, entonces mismo mensaje y sin efecto (R-6: vencido).
5. Dada una alumna que hace `PATCH profiles` con `role = 'teacher'` por PostgREST, entonces 42501
   (`profiles_guard`, 0005). Entra al harness bajo T-049 aunque ya exista (R-6: autopromoción).
6. Dado cualquier cliente, cuando hace `select`, `insert` o `update` sobre `teacher_invitations`, o
   llama `accept_teacher_invitation` o `admin_list_users`, entonces 42501.
7. Dado un mail con invitación pendiente, cuando el admin invita de nuevo, entonces el índice
   parcial rechaza y la UI ofrece "reenviar", que revoca y crea otra.
8. Dado `?q=delf` en usuarios, entonces sólo coincidencias por nombre o mail, 25 por página, y el
   cursor sigue sin repetir ni saltear filas aunque dos compartan `created_at`.
9. Dado un `after` manipulado o malformado, entonces la lista arranca desde el principio, sin 500.
10. Dado el guard del último admin (`actions.ts` 53-72), entonces aceptar una invitación nunca quita
    un admin ni abre otro camino para cambiar roles fuera de `service_role`.

### Cómo se verifica
`npm test`: tabla, guard (con su caso en `guard-reachability`), `accept_teacher_invitation` en los
cuatro desenlaces (ok, ajeno, vencido, revocado), `execute` cerrado, keyset estable con `created_at`
repetido. B-1: criterios 3, 5 y 6. Vitest: hash del token y parseo del cursor. Playwright: invitar,
registrarse, confirmar, aceptar, ver `/panel/docente`.

### Riesgo
Primer cambio de rol que no inicia un admin con un click. Tres defensas, cada una con ataque: el
token vive sólo en el mail de esa persona, el mail del token debe coincidir con el de la sesión
confirmada, y la escritura ocurre sólo en una función que `authenticated` no puede ejecutar. Si el
mail llega a una casilla equivocada, el peor caso es un `teacher` que el admin revierte: nunca `admin`.
