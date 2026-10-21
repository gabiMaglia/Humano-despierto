# SP-3 · Alumno completo

**Fecha:** 2026-10-21 · **Maestro:** `2026-10-21-cierre-funcional-master.md` · **Depende de:** SP-0
**Paralelizable con:** SP-1, SP-2 (archivos disjuntos; el orquestador lo verifica, P-24)
**Orden interno:** T-044 → T-045 → R-01 → T-046. T-046 consume el `?t=` que T-045 implementa.

Del maestro, sin re-litigar: S-B (sin "marcar completada" manual, ADR-007 intacto), R-1..R-14,
timestamp reservado `20261021140000` para T-044.

## Hechos medidos (base `4bd9f27`)

- No existe ningún `route.ts` en `webApp/src`. T-044 crea el primero.
- `lesson-player.ts:173-177` pide de `lesson_resources` sólo `id, position, type, name, size_label`.
  `drive_file_id` y `url` no están en ningún grant de cliente (`0003:98-103`), y eso ya lo cubren
  `rls-mutation.test.mjs:313-405` ("el localizador del material pago no se sirve al cliente", con
  control de mutación en `:767-772`) y el harness `b1:122-124`.
- `lesson-player.ts:147-149` resuelve el acceso con `getStudentCourseAccess(row.course_id)` más
  `row.is_preview`, y recién después (`:153-158`) lee `video_id` con service_role. Ese es el patrón.
- `LessonPlayer.tsx:425-438`: Recursos dibuja tipo, nombre y peso, sin link. `:289`: el `<aside>`
  de pestañas es `hidden md:flex` (en móvil no hay currículum, notas ni recursos; el tablist ya
  cumple ARIA, el problema es CSS). `:247`: "1.0×" es un `<span>` fijo; `useYouTubePlayer.ts:22-31`
  no expone `setPlaybackRate` ni escucha `onPlaybackRateChange`.
- `useYouTubePlayer.ts:130` arranca en `initialStartSeconds` (`LessonPlayer.tsx:124`:
  `completed ? 0 : initialSecondsWatched`). Nadie lee `searchParams`: **`?t=` no se respeta hoy.**
- `actions.ts:174-213`: `saveLessonNote` inserta; no hay `update` ni `delete`. Las policies
  `lesson_notes_update_own`/`delete_own` (`0004:141-146`) y los grants (`0003:128-129`) ya existen.
  Ningún test de `supabase/tests/` ataca una nota ajena.
- `lesson_notes.course_id` sólo participa de la FK compuesta hacia `lessons` (`0001:215-216`): el
  embed `course:courses(...)` no resuelve (PGRST200), misma trampa que `lesson-player.ts:114-118`.
- `/panel` no tiene vista de notas.

---

## T-044 · Recursos descargables gateados por inscripción

**Agente:** `nerv-web` + `nerv-security` en revisión · **Nivel:** Strong (toca permisos y localizadores;
CÓMO obligatorio en `engram/plans/T-044.md`) · **Dependencias:** SP-0.

### Por qué
La alumna ve que la lección trae un PDF y no puede bajarlo. El localizador está protegido en la base
(ADR-003 regla A) pero nadie lo sirve: se hizo la mitad de seguridad y la funcionalidad nunca llegó.
R-8 dice "Server Action tras verificar inscripción"; acá se cumple el espíritu con un route handler.

### Decisión: route handler, no Server Action
`GET /leccion/[id]/recurso/[resourceId]` en `webApp/src/app/leccion/[id]/recurso/[resourceId]/route.ts`.

- Un `<a href>` común: funciona sin JS, con click derecho "guardar como", con el botón atrás y con el
  lector de pantalla, que anuncia un link y no un botón que hace magia.
- El localizador **no viaja al HTML**. Una Server Action que devuelva la URL la deja en memoria del
  cliente y en el log de red antes de que la alumna decida bajar nada. Con el handler, el localizador
  sólo aparece en el `Location` del 302, en el momento del click y para quien ya pasó el control.
- Limitación aceptada (`01_requirements.md` §Riesgo aceptado): después del 302 la URL de Drive queda
  en el navegador de una usuaria autorizada. No se proxyea el archivo. `download` en el `<a>` no
  aplica a redirecciones cross-origin; Drive manda su propio `Content-Disposition`.

### Flujo del handler
1. `createClient()` de sesión. Sin usuario y lección no `is_preview`: denegar.
2. Helper compartido `getLessonAccess(lessonId)` en `lesson-player.ts`, extraído de las líneas
   119-149 de hoy, devuelve `{ courseId, isPreview, hasAccess }` con el cliente de sesión;
   `getLessonPlayerData` pasa a usarlo. **Una sola función decide el acceso para video y recursos.**
3. Con acceso resuelto, y recién ahí, `createServiceRoleClient()` lee
   `lesson_id, drive_file_id, url` de `lesson_resources` por `resourceId`. Si `lesson_id` no coincide
   con el `[id]` de la ruta, denegar: un id de recurso de otro curso bajo una lección propia no abre
   nada.
4. 302 a `https://drive.google.com/uc?export=download&id=<drive_file_id>` si hay `drive_file_id`;
   si no, a `url`. El CHECK `lesson_resources_has_target` garantiza que hay uno.
5. Toda respuesta lleva `Cache-Control: private, no-store`: un 302 cacheado por un proxy es un
   localizador servido a la siguiente persona que pase.
6. Toda denegación es **403 con cuerpo vacío**, sin distinguir "no existe", "no es tuyo", "sin
   sesión" ni "no es de esta lección". Misma doctrina que el `notFound()` del player (T-006 c.2/c.3).

### Migración
Ninguna: `drive_file_id` y `url` existen desde `0001:152-153`. `20261021140000` queda sin usar.

### Qué se toca
- Nuevo `src/app/leccion/[id]/recurso/[resourceId]/route.ts`.
- `src/lib/server/lesson-player.ts`: extraer `getLessonAccess`; `PlayerResource` suma `href`
  (ruta interna, no localizador).
- `src/components/player/LessonPlayer.tsx:427-438`: la tarjeta pasa a ser `<a href={r.href}>` con
  `aria-label="Descargar <nombre>"`, glifo `↓` decorativo.
- Tests: Playwright (runner de T-039) para los ataques HTTP; el harness `b1` sólo habla con
  PostgREST y no alcanza al handler.

### Criterios (Gherkin)
1. **Dado** alumna con inscripción activa, **cuando** clickea un recurso con `drive_file_id`,
   **entonces** recibe 302 a `drive.google.com/uc?export=download&id=…` y `Cache-Control: private, no-store`.
2. **Dado** recurso tipo `link` con `url` y sin `drive_file_id`, **cuando** se pide, **entonces** 302 a `url`.
3. **Dado** anónima y lección `is_preview`, **cuando** pide un recurso de esa lección, **entonces** 302.
   Los recursos de una lección preview son material de venta, igual que su video.
4. **Dado** anónima y lección no preview, **cuando** pide el recurso, **entonces** 403 con cuerpo vacío.
5. **Dado** alumna sin inscripción en el curso, **cuando** pide el recurso, **entonces** 403 vacío.
6. **Dado** alumna inscripta en el curso A, **cuando** pide `/leccion/<lección de A>/recurso/<recurso de B>`,
   **entonces** 403. Y **cuando** pide `/leccion/<lección de B>/recurso/<recurso de B>`, también 403.
7. **Dado** inscripción `revoked`, **cuando** pide el recurso, **entonces** 403. `getStudentCourseAccess`
   ya filtra `status = 'active'` (`enrollment.ts:98`); el test lo prueba, no lo asume.
8. **Dado** `resourceId` inexistente o malformado, **entonces** 403, sin stack trace ni mensaje de Postgres.
9. **Dado** cualquier rol de cliente, `select drive_file_id` sobre `lesson_resources` da 42501. Ya
   cubierto (`rls-mutation.test.mjs:313-405`, `b1:122-124`); se cita en el commit, no se reescribe.
10. El HTML servido de `/leccion/[id]` **no contiene** `drive.google.com` ni `drive_file_id`
    (`curl -b` + `grep` con cookie de alumna, documentado en el commit).

### Cómo se verifica
`cd webApp/supabase && npm test` · `bash harness/b1-postgrest-attacks.sh` · `cd webApp && npm test`
(Playwright, casos 1-8 contra seed: inscripta, de otro curso, revocada, anónima) · c.10 a mano ·
`tsc`, `lint`.

### Riesgo
Drive interpone una página de confirmación para archivos de más de ~100 MB. Es de Google, no
nuestro; se anota en el engram y no se intenta resolver.

---

## T-045 · Player a la altura de Udemy

**Agente:** `nerv-web` · **Nivel:** Advisory · **Dependencias:** T-044 (comparte `LessonPlayer.tsx`;
se hace después para no pisar el mismo archivo en paralelo).

### Por qué
El player termina una lección y se queda mudo, no cambia de velocidad, no se puede usar desde el
teléfono y las notas son de sólo escritura. Cada hueco es una razón para abrir YouTube en otra
pestaña, y ahí se pierde el progreso.

### Decisiones
- **Siguiente lección se calcula en el servidor.** `getLessonPlayerData` suma `nextLesson:
  { id, title } | null`: la primera de `modules` en orden `(modulePosition, position)` después de la
  actual que no sea `locked`. Si no hay, el cierre linkea a `/certificado/<code>` cuando
  `ensureCertificate` devuelve código, si no a `/panel`.
- **Velocidad y autoplay en `localStorage`, no en DB.** Claves `hd.player.rate` y
  `hd.player.autoplay`. Son preferencias de dispositivo, no datos de la alumna. Una tabla
  `player_preferences` sería migración, grants, RLS y tests para guardar un número. Si el PO pide
  sincronizar entre dispositivos, es otro ticket. Lectura y escritura en `try/catch`.
- **Velocidad real sobre la IFrame API.** Doc oficial verificada (Context7,
  `developers.google.com/youtube/iframe_api_reference`): `setPlaybackRate(rate)` es una sugerencia y
  el estado se toma del evento `onPlaybackRateChange`, nunca del valor pedido.
  `getAvailablePlaybackRates()` da las opciones válidas (siempre incluye `1`). Cue/load resetean a
  1, por eso la tasa guardada se aplica en `onReady`.
- **Un solo tablist, dos layouts.** El `<aside>` pasa de `hidden md:flex` a `flex w-full md:w-72` y
  el contenedor a `flex-col md:flex-row`: en móvil las pestañas quedan debajo del video. Sin DOM
  duplicado ni drawer. R-13: cero estilo nuevo.
- **`?t=` lo implementa este ticket.** `page.tsx` lee `searchParams.t`, valida entero `>= 0` y lo
  pasa como `startSeconds` con prioridad sobre `initialSecondsWatched`. T-046 depende de esto.
- **S-B se mantiene.** No hay botón "marcar completada". El estado `done` del sidebar es el que ya
  deriva `access.completedLessonIds` (`lesson-player.ts:222`); sólo se hace visible.

### Migración
Ninguna.

### Qué se toca
- `useYouTubePlayer.ts`: la interfaz suma `setPlaybackRate`, `getPlaybackRate`,
  `getAvailablePlaybackRates` y el evento `onPlaybackRateChange`; el hook expone `playbackRate`,
  `availableRates`, `setPlaybackRate`, `ended` (`PlayerState.ENDED`) y acepta `startSeconds`.
- `lesson-player.ts`: `nextLesson`, `closingHref`.
- `src/app/leccion/[id]/page.tsx`: `searchParams`.
- `LessonPlayer.tsx`: selector de velocidad, tarjeta de fin, autoplay con cuenta regresiva
  cancelable, sidebar responsive, "n/m" por módulo, edición y borrado de notas.
- `actions.ts`: `updateLessonNote(noteId, body)` y `deleteLessonNote(noteId)` con cliente de sesión
  y `.eq("user_id")` como defensa en profundidad; el control es la RLS y el test ataca la policy.
- `supabase/tests/rls-mutation.test.mjs`: "edito/borro la nota de otra": `asStudent` sobre una nota
  de `asOutsider` afecta 0 filas; control de mutación que quita `using (user_id = auth.uid())`.
- `harness/b1`: `PATCH`/`DELETE lesson_notes?id=eq.<ajena>` con `Prefer: return=representation`
  esperan `200` con `[]` (RLS filtra en silencio, no da 403: se afirma "cero filas").

### Criterios (Gherkin)
1. **Dado** una lección que no es la última, **cuando** el video entra en `ENDED`, **entonces** aparece
   "Siguiente: <título>" con link a `/leccion/<id>`; el mismo link vive siempre en la barra de controles.
2. **Dado** la última lección publicada y curso completo, **entonces** el cierre linkea al certificado;
   **dado** curso incompleto, linkea a `/panel`. Nunca a una lección `locked`.
3. **Dado** autoplay activado, **cuando** termina el video, **entonces** cuenta regresiva de 5 s con
   botón "Cancelar"; **dado** autoplay desactivado (default), no navega sola.
4. **Dado** que elijo 1.5×, **entonces** el selector muestra 1.5× sólo después de `onPlaybackRateChange`,
   y al abrir otra lección arranca en 1.5×. Las opciones salen de `getAvailablePlaybackRates()`.
5. **Dado** viewport de 375 px, **entonces** currículum, notas y recursos son alcanzables debajo del
   video, con el mismo tablist y la misma navegación por flechas.
6. **Dado** una lección completada, **entonces** en el sidebar lleva `✓` con `aria-label="Completada"`
   y cada módulo muestra "n/m". No existe ningún control que escriba `completed` (S-B).
7. **Dado** una nota propia, **cuando** la edito, **entonces** se guarda `body` nuevo y conserva
   `at_seconds`; **cuando** la borro, desaparece sin recargar. Vacía no se guarda.
8. **Dado** `/leccion/<id>?t=754`, **entonces** el player arranca en 754 s aunque haya progreso guardado
   en otro segundo; `?t=abc` o `?t=-3` se ignoran; `?t=` mayor que la duración se recorta.
9. **Dado** anónima en lección preview, **entonces** velocidad y siguiente funcionan; notas y progreso
   siguen sin persistir (`isAuthenticated`, T-006 rechazo 1).
10. Test unitario (Vitest) de la función pura que resuelve `nextLesson` con tres casos: medio del
    curso, salto de módulo, última. Test de la función que parsea `?t=`.

### Cómo se verifica
`cd webApp && npm test` (Vitest c.10; Playwright c.1, c.5, c.7, c.8) · `cd webApp/supabase && npm test`
y `b1` (nota ajena) · c.4 a mano con captura en el commit (la IFrame API no corre en jsdom) ·
`tsc`, `lint`, `check-adr004.sh`.

### Riesgo
El autoplay navega con `router.push` y el `flushProgress(true)` del desmontaje
(`LessonPlayer.tsx:139`) hoy es `void`. El ticket espera el flush antes de navegar, o se pierde el
último tramo de la lección recién terminada, que es justo el que cruza el 90 %.

---

## R-01 · Rating al catálogo

Spec propio y cerrado: `docs/superpowers/specs/2026-09-10-R-01-rating-en-el-catalogo.md`. Se ejecuta
dentro de SP-3 tal cual, sin cambios de alcance. Única novedad: con el runner de T-039, la función de
orden con caso de empate (c.5 de ese spec) va con test Vitest, no a mano. Archivos disjuntos de
T-044/T-045: puede ir en paralelo.

---

## T-046 · Mis notas en el panel

**Agente:** `nerv-web` · **Nivel:** Advisory · **Dependencias:** T-045 (`?t=`), SP-0.

### Por qué
Las notas sólo se ven desde la lección donde se escribieron: la alumna tiene que acordarse dónde
anotó. Udemy las agrupa por curso y lección y cada una lleva al segundo exacto.

### Decisiones
- `/panel/notas`, Server Component en `src/app/(app)/panel/notas/page.tsx`. Sólo lectura: editar y
  borrar viven en la lección (T-045), que es donde está el contexto del video.
- `getStudentNotes()` en `src/lib/server/notes.ts` (`import 'server-only'`), cliente de sesión
  (RLS `lesson_notes_read_own`). Dos consultas por la FK compuesta: notas con embed
  `lesson:lessons(id, title, position, course_id, module:course_modules(title, position))`, después
  `courses` por `in(course_id)`. Agrupa en TypeScript. Sin SQL nuevo ni función que justificar.
- Cada nota linkea a `/leccion/<lesson_id>?t=<at_seconds>`.
- Inscripción revocada: el grupo se muestra con sus notas, sin link y con la leyenda "Sin acceso al
  curso". La nota es de la alumna; el video no. Se cruza con `getStudentDashboard`.
- Link "Mis notas" en la cabecera de `/panel`, junto a "Ver todos".

### Migración
Ninguna.

### Qué se toca
`src/lib/server/notes.ts` (nuevo) · `src/app/(app)/panel/notas/page.tsx` (nuevo, con `metadata`
y `robots: noindex` como el resto de `(app)`, R-11) · `src/app/(app)/panel/page.tsx` (link) ·
test Vitest de la función pura de agrupado.

### Criterios (Gherkin)
1. **Dado** notas en dos cursos, **entonces** `/panel/notas` las agrupa por curso y, adentro, por
   módulo y lección en orden de currículum; dentro de la lección, por `at_seconds` ascendente.
2. **Dado** una nota en 12:34 de la lección X, **cuando** clickeo su timestamp, **entonces** llego a
   `/leccion/X?t=754` y el video arranca ahí (c.8 de T-045).
3. **Dado** alumna sin notas, **entonces** estado vacío con link al panel, sin encabezados huérfanos.
4. **Dado** curso con inscripción revocada, **entonces** sus notas se listan sin link y con la leyenda.
5. **Dado** otra alumna logueada, **entonces** no ve ni una nota ajena. Es la RLS existente; se cita
   el caso de T-045 en `rls-mutation.test.mjs` como evidencia, no se reescribe.
6. **Dado** anónima, **cuando** pide `/panel/notas`, **entonces** redirige a `/entrar` (layout `(app)`).
7. Test unitario del agrupado: dos cursos y una lección sin módulo (dato roto se omite con
   `console.error`, no tira la página). `tsc`, `lint`, `check-seo.sh` en verde.

### Cómo se verifica
`cd webApp && npm test` (Vitest c.7; Playwright c.2, c.6) · `check-seo.sh` · c.1 y c.4 a mano con
el seed (alumna con notas en dos cursos, una inscripción revocada).

### Riesgo
No pagina. Umbral escrito: más de 200 notas por alumna pide paginación o colapso por curso.

---

## Al cerrar SP-3
Verificadores: los del maestro. Engram: `_state.md`, `03_backlog.md`, `05_handoff_log.md` por
ticket; anotar que `20261021140000` quedó libre; ADR-003 suma una línea: "el localizador de recurso
se sirve por 302 desde `/leccion/[id]/recurso/[resourceId]`, nunca en HTML".
