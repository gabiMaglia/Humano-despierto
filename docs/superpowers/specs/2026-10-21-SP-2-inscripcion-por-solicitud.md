# SP-2 · Inscripción por solicitud

**Fecha:** 2026-10-21 · **Maestro:** `2026-10-21-cierre-funcional-master.md` (D1, D2, R-1..R-14) ·
**Depende de:** SP-1 (T-040: `?next=` en `/entrar` y mail confirmado antes de tener sesión).
Un solo ticket. Nada de acá re-litiga D2: el alumno pide, queda pendiente, el admin aprueba, sale mail.
Cuando lleguen los pagos, el webhook ocupa el lugar del click del admin (D1).

---

## T-043 · Inscripción por solicitud y cola de aprobación

**Agente:** `nerv-backend` (migración, guards, tests) + `nerv-web` (ficha, panel, admin) ·
**Nivel:** Strong (toca permisos y migración; CÓMO obligatorio en `engram/plans/T-043.md`) ·
**Dependencias:** T-040 (`/entrar?next=`), T-039 (runner Vitest/Playwright) ·
**Migración:** `20261021130000_0026_enrollment_requests.sql` (número a confirmar contra `schema_migrations` al arrancar).

### Por qué
Hoy la única forma de inscribir es `setEnrollmentAction` en `panel/admin/actions.ts` (líneas 90-134):
el admin elige alumna y curso a mano con `EnrollmentGrantForm`. La ficha (`cursos/[slug]/page.tsx:296`)
manda a `/inscribirme/[curso]`, una maqueta `'use client'` que ignora el param, muestra precios fijos
en string y tiene botones sin handler. No hay ningún camino por el que una alumna exprese que quiere
un curso. D2 lo define: solicitud desde la ficha, cola en el admin, mail al aprobar.

### Decisión de modelo: `requested` en `enrollments.status`, no tabla aparte
1. El invariante "inscripción activa = acceso" lo leen `has_course_access()` (0002:74), `getStudentCourseAccess`,
   `getStudentDashboard` (`enrollment.ts`) y el índice parcial `enrollments_active_idx`: **todos filtran
   `status = 'active'` explícitamente**, así que una fila `requested` es invisible para el acceso sin tocar una línea.
2. Una tabla `enrollment_requests` obligaría a un segundo UNIQUE cruzado con `enrollments` para "no pedir
   lo que ya tenés", y a mover la fila al aprobar: dos escrituras donde hoy hay un `upsert`.
3. El precio es un INSERT de cliente sobre `enrollments`, que ADR-008 listaba como "sin INSERT". Se aplica
   la regla del ADR (whitelist de columnas + guard de estado), no se cambia; se corrige la enumeración
   final del ADR-008 en `02_architecture.md` como nota de T-043. Si el gate lo sube a Adversarial, se acata.

**Acceso con `requested`: ninguno.** Ni player, ni panel, ni Campus, ni reseñas: todo pasa por `status = 'active'`.

### Migración
- `status` CHECK pasa a `('requested', 'active', 'revoked', 'rejected')`. **Default pasa a `'requested'`**:
  una inscripción nace solicitada; activarla es privilegio de `service_role`, igual que `courses` nace `draft`.
  Todo INSERT existente ya pasa `status` explícito (`seed.sql:512,672`, harness, `setEnrollmentAction`)
  salvo `tests/seed.mjs:66`, que hay que corregir a `'active'` explícito o la alumna de los tests pierde acceso.
- Columnas nuevas: `requested_at timestamptz` (la pone el guard, nunca el cliente), `decided_at timestamptz`,
  `decided_reason text` con `char_length <= 500` y el par de R-3 (`text_has_locator` + `body_has_known_locator`):
  lo escribe el admin y lo lee la alumna, es texto libre servido a otro usuario. `granted_by` sigue siendo
  quien aprobó; `enrolled_at` se reescribe a `now()` al aprobar.
- CHECK de consistencia: `decided_reason is null or status in ('rejected', 'revoked')`.
- `mail_log.mail_type` tiene un CHECK cerrado (`0019:93`, hallazgo de SP-5): esta migración lo reemplaza
  agregando `'enrollment_rejected'`. Sin eso el mail de rechazo falla al registrar y el test de dedupe no
  puede existir.
- Grants (R-1, en `0003` o en esta migración, mismo patrón): `grant insert (user_id, course_id) on enrollments
  to authenticated`. **`status`, `granted_by`, `requested_at`, `decided_*` fuera del grant** (R-4). Sigue sin
  UPDATE ni DELETE para cliente.
- Policy `enrollments_insert_own_request` for insert to authenticated with check
  `(user_id = auth.uid() and exists (select 1 from courses c where c.id = course_id and c.status = 'published'))`.
- Guard `enrollments_guard_insert` (BEFORE INSERT, SECURITY INVOKER, `search_path = ''`, con bypass
  `is_service_context()` porque es PERMISO, ADR-011): si no es servicio y `new.status is distinct from
  'requested'` ⇒ `raise 42501 'una inscripción nace solicitada: activarla es privilegio de service_role (T-043)'`;
  además fuerza `new.granted_by := null`, `new.requested_at := now()`, `new.decided_* := null`.
- Guard `enrollments_guard_update` (BEFORE UPDATE, mismas convenciones): si no es servicio ⇒ `raise 42501`.
  Segunda capa sobre la ausencia de grant de UPDATE. Cubre el ataque "requested a active" aunque alguien
  "destrabe" el grant.
- Checklist ADR-011 contestado en el encabezado de la migración: operación legítima (alumna inserta la suya;
  admin vía `service_role` cambia estado) · bypass sí · dos actores mismo rol no aplica (sólo la dueña inserta)
  · cubre INSERT y UPDATE · valor sin cambio pasa.
- Pie: `revoke execute on all functions in schema public from public` (regla 0005:153).
- El UNIQUE `(user_id, course_id)` existente es lo que impide pedir dos veces y pedir lo que ya se tiene.

### Transiciones (las aplica el Server Action con `service_role`, con `.eq("status", <origen>)` en el UPDATE y chequeo de `count`)
`requested → active` (aprobar) · `requested → rejected` (rechazar, motivo opcional) · `rejected → active`
(el admin reconsidera; mismo botón "Aprobar") · `active ↔ revoked` como hoy. No hay `rejected → requested`
desde el cliente: una solicitud rechazada no se re-pide, se escribe a la escuela. `setEnrollmentAction` sigue
existiendo para el alta manual y su `upsert` pisa una `requested` con `active`: eso es aprobar, y el mail sale igual.

### Qué se toca
- `webApp/supabase/migrations/20261021130000_0026_enrollment_requests.sql` (nueva).
- `webApp/supabase/tests/seed.mjs:66` (status explícito) · `tests/insert-guards.test.mjs` (`INSERT_ESPERADO`
  suma `enrollments.user_id`, `enrollments.course_id`) · `tests/guard-reachability.test.mjs` (un caso por trigger
  nuevo o la meta-aserción falla) · `tests/enrollment-requests.test.mjs` (nuevo) · `harness/b1-postgrest-attacks.sh`.
- `webApp/src/app/(marketing)/cursos/[slug]/page.tsx`: CTA según estado · `cursos/[slug]/actions.ts` (nuevo,
  `requestEnrollmentAction`, cliente de sesión, `course_id` resuelto en servidor desde el slug, nunca del form).
  Se quita el botón "Hablar con una guía antes": no hay canal definido y un `mailto:` expondría el email de
  la docente, que vive en `auth.users` y nunca es público; la ficha ya linkea a `/guias/[slug]`.
- `webApp/src/lib/server/enrollment.ts`: `getStudentEnrollmentState(courseId)` devuelve `none | requested | active
  | revoked | rejected` + `decidedReason`; `getStudentDashboard` suma `pending: { courseId, slug, title, requestedAt }[]`.
- `webApp/src/app/(app)/panel/page.tsx`: bloque "Solicitudes enviadas" arriba de los cursos.
- `webApp/src/lib/server/admin.ts`: `listPendingEnrollmentRequests()`; `EnrollmentStatus` pasa a los 4 valores.
- `webApp/src/app/(app)/panel/admin/actions.ts`: `approveEnrollmentRequestAction`, `rejectEnrollmentRequestAction`
  (ambas tras `requireAdmin()`); `ENROLLMENT_STATUSES` de `setEnrollmentAction` no cambia.
- `webApp/src/app/(app)/panel/admin/page.tsx` + `components/admin/EnrollmentRequestRow.tsx` (nuevo): sección
  "Solicitudes pendientes" con contador, Aprobar y Rechazar con `textarea` de motivo opcional. `EnrollmentRow`
  muestra los 4 estados y el motivo.
- `webApp/src/lib/server/mail/templates/enrollment-rejected.ts` (nuevo, mismo `layout.ts`) · `mail/notify.ts`:
  `MailType` suma `"enrollment_rejected"`, `notifyEnrollmentRejected({ studentId, courseId, reason })` con
  `scope_key = course.id` canónico (lección ronda 7) y la misma captura total de errores. Aprobar reutiliza
  `notifyEnrollmentActivated` (alumna + `teacher-new-student`), sin tocarlo.
- Ruta `/inscribirme/[curso]`: **se borra el directorio** y se agrega en `next.config.ts` `redirects()` con
  `{ source: "/inscribirme/:curso", destination: "/cursos/:curso", permanent: true }` (308, corre antes del proxy).
  Se saca `/inscribirme` de `proxy.ts` (líneas 10 y 55), de `robots.ts:14`, de `scripts/check-seo.sh:58,68` y
  de `scripts/check-adr004.sh:37,89`: un redirect a una pública no se lista como privada. Sitemap no cambia.
- `engram/02_architecture.md`: nota en ADR-008 (enumeración) · `04_api_contracts.md`: las tres actions.

### Criterios (Gherkin)
1. **Dado** un visitante sin sesión en `/cursos/tarot-iniciatico`, **cuando** toca "Solicitar inscripción",
   **entonces** va a `/entrar?next=/cursos/tarot-iniciatico` y al volver ve el mismo botón, sin solicitud creada.
2. **Dado** una alumna con sesión y sin fila en `enrollments` para ese curso publicado, **cuando** toca el botón,
   **entonces** existe una fila `status = 'requested'`, `requested_at` puesto, `granted_by` nulo, y la ficha
   muestra "Solicitud enviada" sin botón.
3. **Dado** una alumna con solicitud pendiente, **cuando** entra a `/panel`, **entonces** ve el curso bajo
   "Solicitudes enviadas" con la fecha y **no** lo ve entre sus cursos ni puede abrir ninguna lección
   (`/leccion/[id]` de ese curso responde como sin inscripción).
4. **Dado** una fila `requested`, **cuando** la alumna vuelve a enviar el formulario, **entonces** la base responde
   `23505`, la action devuelve "Ya tenés una solicitud para este curso" y no se crea otra fila.
5. **Dado** un curso en `draft` o `archived`, **cuando** una alumna inserta una solicitud por PostgREST,
   **entonces** `42501` (policy) y ninguna fila.
6. **Dado** el admin en `/panel/admin`, **cuando** aprueba, **entonces** la fila pasa a `active`, `granted_by`
   es el admin, `enrolled_at` se reescribe, la alumna ve el curso en `/panel`, y salen `enrollment-granted` y
   `teacher-new-student` una sola vez aunque aprueben dos admins a la vez (`mail_log`, R-12).
7. **Dado** el admin, **cuando** rechaza con motivo, **entonces** la fila pasa a `rejected` con `decided_at` y
   `decided_reason`, la ficha muestra "Solicitud no aprobada" con el motivo y sin botón, y sale `enrollment-rejected`
   una sola vez. Sin motivo: mismo flujo, mail sin párrafo de motivo.
8. **Dado** un motivo con `drive.google.com/...`, **cuando** el admin rechaza, **entonces** la base lo rechaza
   (R-3) y la action traduce el error como ya hace el panel docente para localizadores.
9. **Dado** una fila `rejected`, **cuando** el admin toca "Aprobar", **entonces** pasa a `active` con los mails de c.6.
10. **Dado** una fila `active`, **cuando** el admin da de baja o reactiva, **entonces** funciona como hoy
    (`EnrollmentRow`, `setEnrollmentAction`) y una `revoked` muestra "Tu inscripción fue dada de baja" en la ficha.
11. **Dado** un SMTP caído, **cuando** el admin aprueba o rechaza, **entonces** la transición igual se guarda y la
    action devuelve éxito (lección T-020).
12. **Dado** `GET /inscribirme/tarot-iniciatico`, **entonces** `308` a `/cursos/tarot-iniciatico`; `robots.txt`
    ya no lo lista; `check-seo.sh` y `check-adr004.sh` pasan sin la ruta.
13. **Dado** `/panel/admin` con cero pendientes, **entonces** la sección dice "No hay solicitudes pendientes" y no
    deja encabezado huérfano (misma regla que T-027 c.1).

### Ataques (R-6, harness `b1-postgrest-attacks.sh`, todos con el JWT de la alumna `b1-`)
- `POST /rest/v1/enrollments {user_id: propio, course_id, status: "active"}` ⇒ 403 (el caso "(a) auto-inscribirse"
  que ya existe en la línea 112 **sigue dando 403**: `status` no está en el grant).
- `POST /rest/v1/enrollments {user_id: OTRO, course_id}` ⇒ 403 (policy).
- `PATCH /rest/v1/enrollments?id=eq.<propia requested> {status: "active"}` ⇒ 403 (sin grant de UPDATE).
- `POST /rest/v1/enrollments {user_id: propio, course_id: <draft>}` ⇒ 403.
- Control positivo: `POST {user_id: propio, course_id: <publicado>}` ⇒ 201 y la fila sale con `status = 'requested'`;
  luego `GET lessons?select=id,video_id` con ese JWT sigue 403 y el camino legítimo de `service_role` activa (201/204).
  Limpieza al final como en las líneas 198 y 318.

### Tests PGlite (R-7, `tests/enrollment-requests.test.mjs`, patrón de `insert-guards.test.mjs`)
- Camino legítimo: `asStudent` inserta `(user_id, course_id)` ⇒ pasa, `status = 'requested'`, `requested_at` no nulo.
- Ataques en mutación real: insertar con `status = 'active'` ⇒ `42501`; **revocando la capa del grant** (`grant
  insert (status)` temporal) el guard sigue cortando con `42501` y el mensaje de T-043; `update ... set status =
  'active'` propio ⇒ `42501`, y con un `grant update (status)` temporal el guard de UPDATE corta igual; insertar con
  `user_id` ajeno ⇒ `42501`; segunda solicitud ⇒ `23505`; curso `draft` ⇒ `42501`.
- `service_role`: `requested → active`, `requested → rejected` con motivo, `rejected → active`, `active → revoked` pasan;
  `decided_reason` en `active` viola el CHECK; motivo con localizador viola el CHECK de R-3.
- `has_course_access()` es `false` con `requested` y `rejected`, `true` con `active`.
- `guard-reachability.test.mjs`: dos casos nuevos (insert de alumna, update de servicio). `insert-guards`: lista actualizada.
- Vitest (R-14, rojo primero): `requestEnrollmentAction` sin sesión, con curso inexistente, con `23505`.
  Playwright: c.1, c.2, c.6 de punta a punta contra el stack local.

### Cómo se verifica
`cd webApp/supabase && npm test` (todo verde, contador sube) · `bash webApp/supabase/harness/b1-postgrest-attacks.sh`
con el stack local · `cd webApp && npx tsc --noEmit && npm run lint && npm test` · `bash webApp/scripts/check-seo.sh`
y `COOKIE=… bash webApp/scripts/check-adr004.sh` · `curl -I /inscribirme/x` da 308 · Mailpit (o el transporte de
desarrollo) muestra un `enrollment-rejected` y un solo `enrollment-granted` por aprobación.

### Riesgo
- **Default `'requested'`.** Cualquier INSERT que confiaba en el default `'active'` crea una fila sin acceso en
  silencio. Sólo `tests/seed.mjs:66` lo hace hoy; el gate es el verde de la suite entera, no un grep.
- **Docentes ven solicitudes.** `enrollments_read` ya expone a la docente las filas de su curso; con `requested`
  verá también pendientes. No es fuga (es su curso) pero T-048 tiene que etiquetarlas, no contarlas como alumnas.
- **Sin aviso al admin.** La cola es pull: nadie le manda mail al admin por cada solicitud. Queda explícito como
  no-objetivo; si hace falta, es un mail `admin-new-request` en SP-6 con la misma dedupe.
- **Reseñas y Campus.** `reviews.ts:116` y `campus.ts:115,177` leen `enrollments` con `.eq("status", "active")`,
  verificado hoy: una `requested` no habilita reseñar ni escribir en el hilo. El plan agrega un caso que lo fije.
