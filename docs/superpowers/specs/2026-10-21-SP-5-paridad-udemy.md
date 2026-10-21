# SP-5 · Paridad Udemy: Q&A, anuncios, wishlist y Mi aprendizaje

**Fecha:** 2026-10-21 · **Base:** `fix/auditoria-seo-a11y` (`4bd9f27`) · **Maestro:** `2026-10-21-cierre-funcional-master.md`
**Origen de diseño:** `2026-09-09-paridad-udemy-design.md` (Ola 2 y 3): sus decisiones se conservan, acá se bajan al
repo actual y al formato Gherkin. **D3:** entran T-030, T-031, T-033; quizzes no. R-1..R-14 rigen sin repetirse.
**Depende de:** SP-1 (mails) y SP-3 (player T-045). **Paralelizable con:** SP-4 si los archivos son disjuntos.
**Orden interno:** T-030 → T-031 → T-033.

## Estado de partida, medido (2026-10-21)
14 tablas · 25 migraciones (última `0025`) · `webApp/src` ≈ 13.5k LOC · 449 tests. Se reutilizan: reseñas (`0024`),
Campus (`0014`), `mail_log` con reclamo atómico y tope de 3 intentos (`0019`..`0022`, `mail/notify.ts`),
`guard_locator_exacto` (`0025`), meta-aserción de alcanzabilidad (`tests/guard-reachability.test.mjs`).

## Qué cambia respecto del spec del 2026-09-09 (deltas, no re-diseño)
- **T-030:** se suman votos y respuesta destacada (YAGNI en el 09-09; el PO los pidió para D3). Dos tablas, como
  se decidió entonces. Preview: el predicado que `0004` ya usa para `lesson_progress`, ver c.1.
- **T-031:** pasa a **Strong** (mail masivo a PII, R-12). El mail deja de ser "opcional y apagado": publicar es el
  acto explícito y dispara un mail por inscripta activa. La marca "no leídas" del 09-09 c.2 se retira (exigía una
  tabla de lecturas que nadie pidió); la reemplazan orden cronológico y fecha visible.
- **T-033:** se retira `enrollments.archived_at`: las pestañas de D3 son En curso / Completados / Guardados /
  Solicitados, sin "archivados". Sólo se migra `course_wishlist`.

## Invariantes compartidos de los tres tickets
- Toda tabla nueva: `REVOKE ALL` + grants por columna en la migración (R-1), sin grant a `anon`.
- Texto libre nuevo: `CHECK (not text_has_locator(col))` **y** trigger `guard_locator_exacto('col', ...)` (R-3);
  `tests/locator-exact-invariant.test.mjs` da rojo si falta la segunda mitad.
- Guard nuevo: la meta-aserción de `guard-reachability` exige un caso de camino legítimo por trigger (R-7).
- `updated_at` sólo se mueve con `before update of body ... when (new.body is distinct from old.body)` (lección `0014`).
- Nombre de autora: nunca por embed de `profiles` (el padrón de alumnas no es público, `0004`); se resuelve con
  una función `security definer` al estilo `campus_post_authors`, sólo para quien escribió en algo legible.
- Server Actions finos, como `circulo/actions.ts`: validan forma, insertan con el cliente de sesión y traducen
  `42501` / `23514` / `23505`. La autoridad es RLS + guard, no el action.

---

## T-030 · Q&A por lección

**Agente:** `nerv-web` + `nerv-arquitecto` · **Nivel:** Strong (plan en `engram/plans/T-030.md`) ·
**Dependencias:** T-045 (player, SP-3) para colgar la pestaña.

### Por qué
Campus es por curso; una alumna trabada en el minuto 12 de la lección 7 no tiene dónde preguntar en contexto. Una
pregunta tiene ciclo de vida y respuesta destacada; en `campus_posts` volvía frágil un `CHECK` ya delicado. **Tabla
nueva, decisión 3 del PO (09-09).** Moderan la docente dueña y el admin: **ADR-012**, contenido sobre el material.

### Migración `20261022120000_0026_lesson_questions.sql`
```
lesson_questions   id, lesson_id (fk lessons), course_id (fk courses, denormalizado para RLS barata),
                   author_id (fk profiles), title text, body text, resolved_at timestamptz, resolved_by uuid,
                   created_at, updated_at, deleted_at, deleted_by, deleted_reason        -- R-5 con CHECK del trío
lesson_answers     id, question_id (fk), course_id (fk, denormalizado), author_id, body text,
                   is_instructor_answer boolean not null default false,                 -- la pone el servidor
                   featured_at timestamptz, featured_by uuid,                            -- destacada: dueña o admin
                   created_at, updated_at, deleted_at, deleted_by, deleted_reason
lesson_question_votes  question_id (fk), user_id (fk), created_at, primary key (question_id, user_id)
```
- Guard: `course_id` se deriva de `lessons` en INSERT, sin bypass (invariante, ADR-011); en `lesson_answers` se
  copia de la pregunta. Denormalizar sin guard es cómo se filtra.
- `is_instructor_answer := owns_course(new.course_id)` en el guard de INSERT; fuera de todo grant de cliente.
- Un destacado por pregunta: índice único parcial `(question_id) where featured_at is not null`. Marcar y desmarcar
  es de `owns_course` o `is_admin`, `featured_by = auth.uid()`, par consistente, sólo sobre `is_instructor_answer`.
- `resolved_at/resolved_by`: autora, dueña o admin. Grant de UPDATE al cliente; el guard decide quién (los grants
  separan columnas por rol, no por fila: lección del guard 0 de `0024`).
- Predicado de lectura `can_read_lesson_qa(course_id, lesson_id)` = `has_course_access(course_id) or
  owns_course(course_id) or is_admin() or lesson_is_preview(lesson_id)`. Siempre `to authenticated`: nunca anon.
  Escritura: el mismo predicado menos `is_admin()` (el admin modera, no participa, criterio de `0014`).
- RLS de UPDATE con `USING = can_read` ancho, como `campus_posts_update`: la fila llega al guard y devuelve
  `42501` explícito en vez de "0 filas, 200 OK".
- Soft delete trío idéntico a `guard_campus_posts`: moderan `owns_course or is_admin`, firmado, motivo obligatorio,
  borrado congelado, `DELETE` rechazado en tres capas (sin grant, sin policy, guard).
- Votos: INSERT y DELETE propios sobre preguntas legibles. Doble voto es `23505` por la PK. Sin votos en respuestas.
- `lesson_question_authors(p_ids)` calcada de `campus_post_authors`. Contador para T-048:
  `course_open_questions(p_course_id)`, `security definer`, exige `owns_course or is_admin`, cuenta preguntas
  vivas sin `resolved_at` y sin respuesta de docente viva.
- Texto: `title` (3..200), `body` (1..4000), `body` de respuestas: R-3 completa. `revoke execute ... from public` al cierre.

### Qué se toca
- `src/lib/server/lesson-qa.ts` (nuevo): `getLessonQuestions(lessonId)` con flags de UI (`canAsk`, `canModerate`,
  `isOwn`, `hasVoted`); destacada primera, preguntas por votos desc y fecha. `leccion/[id]/actions.ts`: `askQuestion`,
  `answerQuestion`, `voteQuestion`, `resolveQuestion`, `featureAnswer`, `moderateQuestion`, `moderateAnswer`.
- `LessonPlayer.tsx`: `TABS` pasa a `["modulos","notas","recursos","preguntas"]`; los datos llegan resueltos por
  `getLessonPlayerData` (como `notes`). `QuestionsTab.tsx` (nuevo, `'use client'`): compositor, lista, voto con
  `aria-pressed`, glifo `✦` en la destacada con `aria-label="Respuesta destacada"` (R-11). Sin pantalla nueva.
- `tests/lesson-questions.test.mjs` (nuevo) · `harness/b1-postgrest-attacks.sh` (sección T-030) ·
  `tests/seed.mjs` (una pregunta y una respuesta sembradas en `courseA`).

### Criterios (Gherkin)
1. **Dado** una alumna con inscripción activa, o con sesión en una lección `is_preview`, **cuando** envía una
   pregunta con título y cuerpo, **entonces** se inserta con `course_id` de la lección y aparece en la pestaña.
2. **Dado** una usuaria con sesión sin inscripción en una lección no preview, **cuando** inserta en
   `lesson_questions`, **entonces** recibe `42501`, y la UI nunca le mostró el compositor.
3. **Dado** una sesión anónima, **cuando** hace `select` sobre cualquiera de las tres tablas, **entonces** `42501`.
   El Q&A no es público.
4. **Dado** la docente dueña responde, **entonces** `is_instructor_answer = true` sin que el cliente lo haya
   mandado; **dado** una alumna responde, **entonces** queda `false`; **dado** un cliente manda la columna,
   **entonces** `42501`.
5. **Dado** una pregunta con una respuesta de docente, **cuando** la dueña o el admin la destacan, **entonces**
   `featured_at/featured_by` quedan completos y se dibuja primera con glifo; **cuando** intentan destacar una
   respuesta de alumna, **entonces** `42501`; **cuando** destacan una segunda, **entonces** `23505`.
6. **Dado** una pregunta ajena, **cuando** otra alumna edita `title` o `body`, **entonces** `42501`.
7. **Dado** una alumna, **cuando** vota la misma pregunta dos veces, **entonces** la segunda es `23505` y el
   contador no cambia; **cuando** quita el voto, **entonces** el `DELETE` propio pasa y el contador baja.
8. **Dado** la autora, la dueña o el admin, **cuando** marcan resuelta, **entonces** `resolved_by = auth.uid()`;
   **dado** otra alumna inscripta, **entonces** `42501`.
9. **Dado** docente dueña o admin, **cuando** borran con motivo, **entonces** el trío queda completo, el cuerpo
   sigue legible con "borrado por ... motivo"; **sin** motivo, `42501`; docente de otro curso, `42501`;
   `DELETE` físico desde cualquier rol de cliente, `42501`.
10. **Dado** un `video_id` real del seed en `title`, `body` o respuesta, **entonces** `42501` por
    `guard_locator_exacto`; un texto con forma de link, `23514`. Las tres columnas figuran en el invariante.
11. **Dado** una lección sin preguntas, **entonces** la pestaña muestra "Nadie preguntó todavía en esta lección"
    con el compositor arriba: deliberado, no roto.
12. **Dado** la docente dueña, **cuando** llama `course_open_questions(courseA)`, **entonces** recibe las preguntas
    sin respuesta de docente; **dado** otra docente, `42501`. T-048 consume esto.
13. **Dado** el player, **cuando** se navega con flechas, **entonces** `preguntas` entra en el ciclo del `tablist`.

### Cómo se verifica
`npm test` en supabase (nuevo archivo + meta-aserciones) · harness: no inscripta pregunta (403) · anon lee (401/403)
· vota dos veces (409) · edita ajena (403) · manda `is_instructor_answer=true` (400 por grant) · destaca respuesta de
alumna (403) · control positivo de la docente respondiendo (201) · `tsc` + `lint` · Vitest sobre el orden.

### Riesgo
El ticket más grande del SP. Si hay que partirlo: **primero preguntas + respuestas + moderación**, **después votos
y destacada**. `lesson_is_preview` abre el Q&A de una lección gratuita a toda sesión: misma superficie que
`lesson_progress` y `lesson_notes` en `0004`; la R-3 completa cubre que ahí se cite material de otra lección.

---

## T-031 · Anuncios de la docente

**Agente:** `nerv-web` + `nerv-arquitecto` · **Nivel:** Strong (mail masivo; plan en `engram/plans/T-031.md`) ·
**Dependencias:** SP-1 (cuentas con mail confirmado).

### Por qué
La única vía de una docente para hablarle a un curso entero; con cursos on-demand (ADR-004) es la única señal de
que el curso está vivo. Llega por mail, con la capa de `mail_log` que ya garantiza "a lo sumo 3 intentos, uno en
vuelo, nunca dos confirmados" por destinataria.

### Migración `20261022130000_0027_course_announcements.sql`
```
course_announcements  id, course_id (fk), author_id (fk profiles), title text, body text,
                      status text not null default 'draft' check (status in ('draft','published')),
                      published_at timestamptz,
                      created_at, updated_at, deleted_at, deleted_by, deleted_reason      -- R-5
```
- `CHECK ((status = 'published') = (published_at is not null))`, mismo que `courses`.
- `status` y `published_at` **fuera de todo grant de cliente** (R-4): publicar es un Server Action con
  `service_role` que antes verificó `owns_course` con la sesión. Mismo mecanismo que `PublishCourseControl`.
- Guard: INSERT exige `author_id = auth.uid()` y `owns_course`; publicado, `title/body` no se editan (lo enviado
  por mail no se reescribe). Soft delete: la dueña retira el suyo, el admin modera cualquiera; firmado, con motivo,
  congelado; `DELETE` físico rechazado en tres capas.
- RLS de lectura: `status = 'published' and (has_course_access or owns_course or is_admin)`, más los borradores
  propios para la dueña. Nunca `anon`: la ficha es pública pero la sección sólo se dibuja con acceso.
- `title` (3..200) y `body` (1..6000): R-3 completa. Una docente puede pegar el `video_id` de un curso ajeno.
- **`mail_log.mail_type` tiene un `CHECK` cerrado** (`0019:93`). Esta migración lo reemplaza agregando
  `'course_announcement'`. Sin eso, el reclamo del turno falla con `23514` y ningún mail sale.
- Índice `(course_id, published_at desc) where status = 'published' and deleted_at is null`.

### Qué se toca
- `src/lib/server/announcements.ts` (nuevo): `getCourseAnnouncements`, `getRecentAnnouncementsForStudent` (últimos
  5 de sus inscripciones activas, para `/panel`), `getTeacherAnnouncements` con borradores.
- `panel/docente/cursos/[courseId]/actions.ts`: `saveAnnouncementDraft`, `publishAnnouncement`,
  `withdrawAnnouncement`. `panel/admin/actions.ts`: `moderateAnnouncement`.
- `src/lib/server/mail/templates/course-announcement.ts` (nuevo): props `studentName, courseTitle, teacherName,
  announcementTitle, announcementBody, courseUrl`. Sin email de nadie en la interfaz (criterio 3 de T-020).
- `src/lib/server/mail/notify.ts`: `MailType` suma `"course_announcement"`; `notifyAnnouncementPublished({
  announcementId })` lista inscriptas activas con `service_role`, excluye a la autora, y por cada una: resolver
  datos, `claimOrReclaimMailSlot(userId, "course_announcement", announcementId)`, `sendMail`, `confirmMailSent`.
  Concurrencia 5 con `Promise.allSettled`; corre en `after()` de `next/server` para que el action responda antes de
  que terminen 200 envíos. Atrapa todo: un SMTP caído deja el anuncio publicado y el log con `sent_at` nulo.
- Ficha `cursos/[slug]/page.tsx`: sección "Anuncios" bajo el currículum, sólo si `access.hasAccess` y hay publicados.
  `/panel`: bloque "Novedades de tus cursos" (T-033 lo integra). Panel docente: pestaña "Anuncios" en `PanelTabs`.
- `tests/course-announcements.test.mjs` · `tests/mail-log.test.mjs` (tipo nuevo acepta, dedupe por anuncio) ·
  harness sección T-031 · Vitest para `notifyAnnouncementPublished` con transporte que falla.

### Criterios (Gherkin)
1. **Dado** la docente dueña, **cuando** crea un anuncio, **entonces** nace `draft` y no lo ve ninguna alumna;
   **dado** otra docente o una alumna, **cuando** insertan en su curso, **entonces** `42501`.
2. **Dado** un cliente con sesión de la dueña, **cuando** manda `status='published'` por PostgREST, **entonces**
   `42501` por grant: publicar sólo existe como Server Action.
3. **Dado** un borrador, **cuando** la dueña publica, **entonces** `published_at` queda puesto, la ficha lo muestra
   a inscriptas activas y a nadie más, y `/panel` lo lista en Novedades.
4. **Dado** un curso con N inscriptas activas, **cuando** se publica, **entonces** `mail_log` tiene N filas
   `(user, 'course_announcement', announcement_id)`; **cuando** se vuelve a disparar el mismo evento, **entonces**
   no se crea ninguna fila nueva y ninguna inscripta recibe dos mails (R-12).
5. **Dado** el transporte SMTP caído, **cuando** se publica, **entonces** el anuncio queda publicado, el action
   devuelve éxito, y las filas quedan con `sent_at` nulo y `attempts` incrementado. El mail nunca rompe la operación.
6. **Dado** un anuncio publicado, **cuando** la dueña edita `body`, **entonces** `42501` (lo enviado no se reescribe).
7. **Dado** el admin, **cuando** borra con motivo, **entonces** trío completo y desaparece de ficha y panel; **dado**
   la dueña sin motivo, `42501`; **dado** una alumna, `42501`; `DELETE` físico, `42501`.
8. **Dado** un curso sin anuncios publicados, **entonces** la sección de la ficha **no se dibuja**. Sin
   "aún no hay anuncios".
9. **Dado** un `video_id` real del seed en `title` o `body`, **entonces** `42501`; link con forma, `23514`.
10. **Dado** una sesión anónima en la ficha, **entonces** no hay sección y `select` directo devuelve `42501`.
11. **Dado** el mail renderizado, **entonces** trae nombre de alumna, curso, docente, título, cuerpo y CTA a
    `/cursos/[slug]`; ningún email de nadie.

### Cómo se verifica
`npm test` en supabase (nuevo archivo + `mail-log.test.mjs`) · harness: alumna publica (403) · dueña manda `status`
(400/403) · docente ajena inserta (403) · anon lee (401/403) · control positivo del borrador (201) · Vitest: con
`__setTransportForTests` que tira siempre, `notifyAnnouncementPublished` resuelve y deja N reclamos · `tsc` + `lint`.

### Riesgo
Difusión sin cola. Si el proceso muere a mitad de camino, las filas sin `sent_at` sólo se retoman si alguien vuelve
a disparar el evento (no hay barrendero, por diseño de T-020). Aceptable al volumen actual; ADR-014 lo revisa.

---

## T-033 · Wishlist y Mi aprendizaje

**Agente:** `nerv-web` · **Nivel:** Advisory con migración (sin texto libre ni PII nueva) ·
**Dependencias:** T-028 (hecho); T-043 (SP-2) sólo para la pestaña Solicitados.

### Por qué
`panel/page.tsx` es una lista plana por `enrolled_at`. El "My Learning" de Udemy es donde una alumna vuelve todos
los días: continuar, filtrar lo terminado, guardar lo que aún no puede cursar. Con inscripción aprobada por un
admin (D2), guardar es la única acción que una alumna puede tomar sobre un curso que le interesa y no tiene.

### Migración `20261022140000_0028_course_wishlist.sql`
```
course_wishlist  user_id (fk profiles), course_id (fk courses), created_at,
                 primary key (user_id, course_id)
```
- RLS de dueña en SELECT / INSERT / DELETE: `user_id = (select auth.uid())`. INSERT exige curso `published` (no se
  guarda un borrador que la alumna no debería saber que existe). Sin UPDATE. `DELETE` físico **sí**: es la única
  tabla del SP sin nada que moderar ni auditar.
- Grants: `select (user_id, course_id, created_at)`, `insert (user_id, course_id)`, `delete`, sólo `authenticated`.
- Sin texto libre: R-3 no aplica. Sin guard trigger: RLS alcanza (criterio 7 del 09-09).

### Qué se toca
- `src/lib/server/wishlist.ts` (nuevo): `getWishlist()`, `getWishlistIds()`. `cursos/actions.ts`: `toggleWishlist`.
- `src/components/molecules/CourseCard.tsx`: hoy el `<article>` entero es un `<Link>`; un `<button>` adentro de un
  `<a>` es HTML inválido. Se reestructura: contenedor `relative`, el link cubre la card, el botón `WishlistButton`
  (`'use client'`, `aria-pressed`, glifo `○` / `●` con `aria-label="Guardar curso"` / `"Quitar de guardados"`) va
  como hermano posicionado. Sin sesión el botón es un link a `/entrar?next=/cursos`. Mismo botón en la ficha.
- `enrollment.ts`: `getStudentDashboard()` suma `lastAccessAt` (máximo `last_seen_at` por curso, fallback
  `enrolled_at`) y ordena desc. `progressPercent === 100` define Completados; derivado, no guardado.
- `src/app/(app)/panel/page.tsx` pasa a "Mi aprendizaje": header, "Continuar donde quedaste" intacto (c.1 del
  09-09: curso tocado más recientemente con progreso < 100), bloque Novedades (T-031), y pestañas por
  `searchParams.tab` ∈ `en-curso | completados | guardados | solicitados` (doctrina T-019: enlazables, botón atrás).
  `solicitados` sólo se dibuja si existe la tabla de T-043. Sin `tab`, `en-curso`. `noindex` ya lo tiene.
- `tests/course-wishlist.test.mjs` · harness sección T-033 · Vitest para el orden por último acceso y los cortes.

### Criterios (Gherkin)
1. **Dado** una alumna con sesión, **cuando** toca Guardar en una card o en la ficha, **entonces** la fila aparece
   en `course_wishlist` y el botón pasa a `aria-pressed="true"` sin recargar; **cuando** lo toca de nuevo,
   **entonces** la fila se borra.
2. **Dado** sin sesión, **cuando** toca Guardar, **entonces** va a `/entrar?next=<ruta actual>` y, al entrar,
   vuelve a esa ruta (mecanismo `?next=` de T-040).
3. **Dado** una alumna, **cuando** inserta `(otra_alumna, curso)`, **entonces** `42501`; **cuando** inserta un
   curso `draft`, **entonces** `42501`; **cuando** lee la wishlist ajena, **entonces** 0 filas.
4. **Dado** `/panel?tab=guardados`, **entonces** lista los cursos guardados con link a la ficha y botón Quitar;
   si la alumna ya tiene inscripción activa en uno, **entonces** ese curso muestra "Ya estás inscripta" y un link
   a continuar, no se duplica en dos pestañas.
5. **Dado** tres cursos con `last_seen_at` distinto, **entonces** En curso los ordena del más reciente al más viejo;
   un curso sin progreso va después, ordenado por `enrolled_at`.
6. **Dado** un curso al 100%, **entonces** aparece sólo en Completados, con "Ver certificado" (T-018 intacto), y
   no en En curso.
7. **Dado** sin inscripciones ni guardados, **entonces** se conserva el vacío actual con salida al catálogo; **dado**
   una pestaña vacía, **entonces** tiene su vacío propio con link al catálogo (no un vacío mudo).
8. **Dado** T-043 implementado, **entonces** Solicitados lista las solicitudes pendientes con fecha; **dado** que no
   existe, **entonces** la pestaña no se dibuja y no hay referencia rota.
9. **Dado** "Continuar donde quedaste", **entonces** sigue llevando a la primera lección pendiente del curso tocado
   más recientemente (`continueLessonId` actual, sin regresión).
10. **Dado** el catálogo con 12 cards, **entonces** los ids guardados se leen en una sola consulta.

### Cómo se verifica
`npm test` en supabase · harness: guardar para otra (403) · guardar borrador (403) · anon guarda (401) · control
positivo (201, 204 al quitar) · `check-adr004.sh` sobre `/panel` · Playwright: guardar sin sesión → login → vuelve
con el curso guardado · `tsc` + `lint`.

### Riesgo
`CourseCard` se usa en catálogo, landing (`FeaturedCourses`) y ficha: verificar las tres y la altura fija de la
card. Si T-043 llega después, la pestaña Solicitados se agrega en T-043, no acá.

---

## Cierre del SP
Done cuando los tres pasan el gate del maestro y `_state.md` dice **17 tablas, 28 migraciones**. Q-12 del 09-09
(mail de anuncio) cierra acá: va por `mail_log` con tope de 3 intentos; la política de tasa se revisa en T-054.
