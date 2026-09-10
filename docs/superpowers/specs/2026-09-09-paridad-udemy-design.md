# Paridad Udemy — spec de implementación

**Fecha:** 2026-09-09 · **Base:** `fix/D-09-vulnerabilidades` (`86d8ef3`)
**Documento hermano:** `2026-09-09-auditoria-pre-produccion.md` (release, no features).

## Decisiones del PO tomadas en el brainstorm

Estas cuatro fijan la forma de todo lo que sigue. No se re-litigan por ticket.

1. **§4 se mantiene.** Sin raster: ni portada de curso ni foto de guía. Se compensa con glifo
   lunar, numeral romano y SVG generativo. **Video promocional sí** — es un embed de YouTube, no
   un archivo de imagen.
2. **ADR-007 intacto.** `completed` sigue siendo derivada al 90% y **nadie la declara, ni
   `service_role`**. No hay marcado manual estilo Udemy. Los quizzes **no** cuentan para el
   certificado.
3. **Q&A por lección va en tabla nueva** `lesson_questions`, no extendiendo `campus_posts`.
4. **Quizzes:** opción múltiple, corrección en el servidor, reintentos libres.

## Estado de partida, medido

12.552 LOC en `webApp/src` · 22 rutas · 13 tablas · 22 migraciones · 384 tests.
Ya a la altura de Udemy: catálogo con filtros y búsqueda reales, currículum acordeón, player de
YouTube con progreso derivado + capítulos + notas + recursos, tres paneles, certificado
verificable, Campus, diario, 4 mails transaccionales.

Corrección respecto del primer barrido: **`is_preview` sí está cableado** —
[CurriculumAccordion.tsx:53](webApp/src/components/course/CurriculumAccordion.tsx#L53) lo marca y
`getLessonPlayerData` lo respeta (ADR-003). No es un faltante.

## Las 8 fichas, en 3 olas

| Ola | Ticket | Migración | Depende de |
|---|---|---|---|
| 1 | **T-027** Ficha de curso completa | sí | — |
| 1 | **T-028** Reseñas y rating | sí | T-027 |
| 2 | **T-029** Player continuo | sí (preferencias) | — |
| 2 | **T-030** Q&A por lección | sí | — |
| 2 | **T-031** Anuncios de la guía | sí | — |
| 2 | **T-032** Quizzes | sí | — |
| 3 | **T-033** Mi aprendizaje + wishlist | sí | T-028 |
| 3 | **T-034** Panel docente con métricas | no | T-028, T-030, T-031 |

**T-034 absorbe a T-025** (que hoy está en el backlog como "panel docente completo", sin
desarrollar). **T-024 (carta natal) queda fuera**: sigue bloqueado por Q-09 —Swiss Ephemeris es
AGPL y el copyleft se dispara por red— y no aporta nada a la paridad con Udemy.

**Migraciones: el número se asigna al arrancar el ticket**, mirando `schema_migrations` real. Los
timestamps reservados van de `20260909120000` en adelante, uno por ticket en el orden de la tabla.
Regla ganada a golpes: *el timestamp tiene que ascender junto con el número*, o 0014 se aplica
antes que 0013.

---

## Reglas transversales — se aplican a los 8 tickets

Ninguna es nueva. Son las que ya defiende el schema, escritas acá para no re-derivarlas ocho veces.

**R-1 · Grants como whitelist.** Toda columna nueva nace sin exponer. Hay que agregarla a mano a
`0003_privileges.sql`. La fricción es deliberada.

**R-2 · RLS lee `profiles.role`, nunca el claim del JWT.** El claim es una foto del momento de
emisión y sobrevive a una degradación de rol hasta el refresh.

**R-3 · ADR-009 sobre todo texto libre nuevo.** Cuerpo de reseña, de pregunta, de respuesta, de
anuncio, y **también título y opciones de quiz**. La lección de T-022 fue exactamente ésa: el
`CHECK` de forma se aplicó al `body` y se olvidó de `title`/`slug`/`excerpt`, y un `video_id` de 11
caracteres pasaba limpio. **Todo campo de texto que se sirva a `anon` lleva las dos protecciones:
`text_has_locator` (forma) y `body_has_known_locator` (coincidencia exacta).**

**R-4 · `status` y `published_at` son del servidor**, fuera de los grants del cliente. Igual que
cursos y posts del diario.

**R-5 · Soft delete con autor y motivo** en todo contenido moderable, con el `CHECK` de
consistencia del trío como en `campus_posts`: o los tres nulos o los tres completos.

**R-6 · Cada ticket suma sus ataques a `b1-postgrest-attacks.sh`.** Un criterio de aceptación que
diga "RLS lo impide" sin un ataque en el harness no está probado.

**R-7 · §4 en todo lo visual.** Sin emojis, sin raster. Glifos Unicode con `aria-label` si son
informativos y `aria-hidden` si son decorativos — ver X-01 de la auditoría.

---

# OLA 1 · La página de venta

## T-027 · Ficha de curso completa

**Agente:** `nerv-web` + `nerv-arquitecto` · **Nivel:** Advisory · **Sin dependencias**

### Por qué
[cursos/[slug]/page.tsx](webApp/src/app/(marketing)/cursos/[slug]/page.tsx) tiene título,
subtítulo, `intro`, "Qué recibes" y currículum. Le faltan las tres cosas que Udemy pone arriba de
todo porque son las que deciden la compra: **qué vas a saber hacer al terminar**, **qué necesitás
saber para empezar**, y **cuánto dura esto realmente**.

Ojo con la confusión que ya existe en el modelo: `courses.includes` es *"Qué recibes"* — material
entregado. **No son objetivos de aprendizaje.** Son campos distintos y hay que agregar el que
falta, no reinterpretar el que hay.

### Migración
En `courses`:
- `learning_objectives text[] not null default '{}'` — "lo que vas a aprender"
- `prerequisites text[] not null default '{}'` — requisitos previos
- `description text` — descripción larga (`intro` queda como el párrafo corto de portada)
- `language char(2) not null default 'es'`
- `promo_video_id text` — mismo `CHECK` de formato que `lessons.video_id`:
  `~ '^[A-Za-z0-9_-]{11}$'`. Pegar la URL entera falla, igual que en lecciones.

Los tres campos de texto y los dos arrays van con las protecciones de **R-3**: se sirven a `anon`.
Grants por columna en `0003` (**R-1**).

### Agregados derivados — se calculan, no se guardan
Número de lecciones publicadas, suma de `duration_seconds` en horas, e inscriptas activas. **Vista
o función, nunca columnas denormalizadas**: una columna `student_count` es una mentira en cuanto
alguien se da de baja, y el proyecto ya tiene la doctrina de derivar en vez de declarar.

Si el plan de consultas resulta caro, la salida es una vista materializada con refresco, no un
contador que la app actualiza a mano.

### Criterios
1. La ficha muestra objetivos, requisitos, descripción larga, idioma, duración total, nº de
   lecciones e inscriptas. Cada campo vacío **se omite entero**, no deja un encabezado huérfano.
2. El video promocional se reproduce **sin inscripción** — es material de venta. Reusa el player
   existente en modo mínimo, no una implementación paralela.
3. La bio de la guía aparece en la ficha, con link a `/guias/[slug]`. Sale de `profiles.bio`,
   que **ya existe en `0001`** — no hace falta esperar a T-023, que sólo agrega el formulario
   para cargarla. Sin foto: **§4, decisión 1**.
4. "Última actualización" sale de `courses.updated_at`, que ya existe.
5. La docente edita todo esto desde su panel. Los arrays se editan como lista, no como un campo de
   texto separado por comas.
6. Los agregados salen de la base y **coinciden con la realidad**. Misma lección que T-019 c.2: un
   número inventado es peor que ningún número.

### Riesgo
`intro` hoy hace de descripción. Al partirse en `intro` + `description` hay que decidir qué pasa
con los cursos existentes: la migración copia `intro` a `description` y deja `intro` como está.
Nadie pierde texto.

---

## T-028 · Reseñas y rating

**Agente:** `nerv-web` + `nerv-arquitecto` · **Nivel:** Strong · **Depende de:** T-027

### Por qué
Es el faltante más grande. Sin rating no hay prueba social, no hay orden por "mejor valorado" en el
catálogo, no hay reseña destacada, y la ficha de curso le pide a alguien que confíe sin darle
ninguna razón externa para hacerlo. Es la pieza de Udemy que más mueve conversión.

Es **Strong** porque cruza tres cosas peligrosas a la vez: texto libre de usuarios, contenido
público sin sesión, y nombre de persona real.

### Migración — `course_reviews`
```
id, course_id (fk), user_id (fk), rating int check (rating between 1 and 5),
body text, created_at, updated_at,
deleted_at, deleted_by, deleted_reason,          -- R-5, con el CHECK del trío
unique (user_id, course_id)                       -- una reseña por alumna y curso
```
- `body` nullable: **se puede puntuar sin escribir.** Udemy lo permite y baja mucho la fricción.
- `CHECK` de **R-3** sobre `body`. Es texto público sin sesión: las dos funciones, no una.
- Rating y `body` son editables por la autora; `deleted_*` no (**R-4**, es de moderación).

### Quién puede reseñar — y esto se decide en RLS, no en la UI (R-6)
**Inscripción activa en ese curso.** No exijo progreso mínimo: `completed` es derivada y usarla
como puerta acopla dos subsistemas sin necesidad; además una alumna que abandonó a la tercera
lección tiene una opinión legítima y particularmente informativa.

Ataques nuevos obligatorios en `b1-postgrest-attacks.sh`:
- reseñar un curso sin inscripción → `42501`
- reseñar dos veces el mismo curso → violación de unique
- editar la reseña de otra persona → `42501`
- escribir `deleted_at` sin ser admin ni la guía dueña → `42501`
- meter un `video_id` real del seed en `body` → violación de `CHECK`

### Agregado
Promedio y distribución por estrella, **derivados** (misma doctrina que T-027). Se exponen en la
ficha y alimentan el orden "mejor valorado" del catálogo, que se suma a los `searchParams` de T-019
sin romper los existentes.

### Criterios
1. Sólo con inscripción activa, y **lo impide RLS**, no el formulario.
2. Una por alumna y curso, editable después.
3. La ficha muestra promedio, total y distribución. Sin reseñas, **estado vacío digno** — no un "0
   ★" que parece un curso malo. Un curso nuevo sin reseñas y un curso malo no se ven igual.
4. Reseña destacada: la más útil, criterio determinista y documentado (la más reciente con 4-5
   estrellas y cuerpo no vacío). Sin votos por ahora: YAGNI.
5. **Moderación: sólo el admin oculta** (**R-5**). La guía **no puede ocultar ni borrar** una
   reseña sobre su propio curso — puede **responderla en público**, una vez, y la respuesta se
   muestra debajo. Es lo que hace Udemy y es mejor que el default que esta spec traía: le da voz
   a la guía sin darle poder sobre lo que se dice de ella. **Cierra Q-11.**
6. Si la alumna **edita** su reseña después de una respuesta, la respuesta **se borra**. Udemy lo
   hace así por una razón buena: una respuesta que quedó colgando de un texto que ya cambió
   descontextualiza a las dos partes.
7. Al completar el curso, el mail que ya manda T-020 suma un link a dejar reseña. **Un solo mail
   más, no una campaña.**
8. §4 en las estrellas: `★`/`☆` Unicode con `aria-label` del valor numérico (**R-7**).

### Q-11 · RESUELTA por investigación (2026-09-09)
La spec traía "la guía modera su propio curso, con autor y motivo registrados". **Se descarta.**
Udemy no deja que el instructor borre ni oculte nada: sólo puede **responder en público**, y esa
respuesta desaparece si la alumna edita su reseña.

Es mejor y por un motivo concreto: el rastro auditable que proponía mi versión sólo sirve si
alguien lo audita, y nadie audita a la dueña del curso en una escuela chica. Quitarle la
capacidad, en vez de registrarla, no depende de que haya un auditor. La guía no pierde voz — gana
la única que corresponde, que es contestar.

**Decisión: sólo el admin oculta. La guía responde.**

---

# OLA 2 · El aula

## T-029 · Player continuo

**Agente:** `nerv-web` · **Nivel:** Advisory

### Por qué
El player es bueno pero es de **una sola lección**: se llega por URL y se sale por el navegador. En
Udemy el player *es* el curso — se avanza sin volver nunca al índice. Es la diferencia más grande
en sensación de producto, y no necesita casi nada de backend.

### Alcance
1. **Prev/next dentro del player**, respetando el orden de módulos y `position`, saltando lecciones
   no publicadas.
2. **Autoplay** con toggle, preferencia persistida por usuario. Al terminar una lección, cuenta
   regresiva visible y cancelable antes de saltar. Nunca salta sin aviso.
3. **Velocidad y subtítulos** expuestos vía IFrame API — `setPlaybackRate` y el módulo de captions.
   Ojo: `0009` fija que hasta 2x cuenta para el progreso. **El selector de velocidad no debe
   ofrecer más de 2x**, o se le muestra a la alumna una opción que le descuenta progreso en
   silencio. Es una restricción de UI que sale de una decisión de schema.
4. **"Continuar donde quedaste"** a nivel curso: la última lección con progreso y sin completar.
   Se deriva de `lesson_progress`, sin columna nueva.
5. **Búsqueda dentro del currículum** en la barra lateral, cliente puro.

### Migración
Sólo preferencias de reproducción (`autoplay`, `playback_rate`) — en una tabla
`user_preferences` o como columnas en `profiles`. **Elegir tabla aparte**: `profiles` está en el
centro de RLS (**R-2**) y no conviene engordarla con datos de UI.

### Criterios
1. Se recorre un curso entero sin volver al índice.
2. El autoplay se puede apagar y la preferencia sobrevive al refresh y al cambio de dispositivo.
3. La velocidad no ofrece por encima de 2x, y el porqué queda comentado en el código.
4. El progreso se sigue guardando con el throttle actual al cambiar de lección — **una lección que
   se abandona a los 3 minutos no puede perder esos 3 minutos** por navegar a la siguiente. Flush
   antes de desmontar.
5. `notFound()` para lección inexistente, y prev/next que **no se dibujan** en los extremos.
6. **A11y como criterio, no como extra** (X-01): el player es uno de los dos componentes que la
   auditoría marca como probablemente inoperables por teclado. Este ticket lo toca entero — es el
   momento de arreglarlo.

---

## T-030 · Q&A por lección

**Agente:** `nerv-web` + `nerv-arquitecto` · **Nivel:** Strong

### Por qué
Campus es por curso: una alumna trabada en el minuto 12 de la lección 7 no tiene dónde preguntar en
contexto. En Udemy el Q&A cuelga de la lección, tiene estado resuelta y la respuesta de la
instructora se destaca. **Tabla nueva, por decisión del PO** — una pregunta tiene ciclo de vida
(abierta/resuelta) que un mensaje de foro no tiene, y mezclar tres modos en `campus_posts` volvía
frágil un `CHECK` que ya es delicado.

### Migración — `lesson_questions`
```
id, lesson_id (fk), course_id (fk, denormalizado para RLS barata), author_id,
title text, body text,
resolved_at timestamptz, resolved_by uuid,
created_at, updated_at,
deleted_at, deleted_by, deleted_reason              -- R-5
```
Y `lesson_answers` con `question_id`, `author_id`, `body`, `is_instructor_answer boolean` (derivado
del rol, **no declarado por el cliente**), más los mismos campos de soft delete.

`course_id` denormalizado en `lesson_questions` es deliberado: sin él, cada política de RLS tiene
que unir contra `lessons`. **Un trigger lo mantiene consistente con `lesson_id`** — denormalizar
sin guard es cómo se filtra.

**R-3 sobre `title` y `body` de ambas tablas.** El Q&A no es legible sin inscripción, pero la
lección de T-022 es que la excepción por visibilidad es exactamente donde se cuela el bug: una
pregunta puede citar el `video_id` de otra lección a la que la autora no tiene acceso.

### Criterios
1. Preguntar y responder **exige inscripción activa** en el curso; lo impide RLS (**R-6**).
2. La guía dueña modera su curso; el admin, todo. Soft delete con motivo.
   **Decidido por ADR-012, no acá:** una pregunta sobre la lección es contenido sobre el MATERIAL,
   no sobre la guía, así que modera quien lo dicta. No se re-litiga por ticket.
3. `is_instructor_answer` lo pone el servidor mirando `profiles.role` y la titularidad del curso
   (**R-2**). Nadie lo declara.
4. Marcar resuelta: la autora de la pregunta o la guía. Queda `resolved_by` registrado.
5. El Q&A vive en una pestaña del player, junto a módulos/notas/recursos. Sin pantalla nueva.
6. Cero preguntas se ve **deliberado**, no roto — es el estado normal de una lección nueva.
7. Ataques al harness: preguntar sin inscripción, responder en curso ajeno, marcar resuelta
   pregunta de otra, `is_instructor_answer = true` desde el cliente.

---

## T-031 · Anuncios de la guía

**Agente:** `nerv-web` · **Nivel:** Advisory

### Por qué
Es la única vía que tiene una guía para hablarle a un curso entero. En un producto 100% on-demand
(ADR-004) —sin cohortes ni fechas— es lo único que da señal de que el curso está vivo.

### Migración — `course_announcements`
```
id, course_id (fk), author_id, title, body,
status ('draft'|'published'), published_at,        -- R-4, servidor
created_at, updated_at, deleted_at/by/reason       -- R-5
```
Mismo `CHECK` que cursos: `(status = 'published') = (published_at is not null)`. **R-3** sobre
título y cuerpo.

### Criterios
1. Sólo la guía dueña publica en su curso. RLS (**R-6**).
2. Se ven en la ficha del curso (las publicadas) y en el aula, con las no leídas marcadas.
3. Nace en borrador; publicar es explícito.
4. **Mail opcional y apagado por defecto.** T-020 sangró ocho rondas por mails no deseados. Un
   anuncio que le llega a 200 personas necesita confirmación explícita de la guía, y **reusa la
   capa de `mail_log` existente** con su estado, tope de intentos y fencing. No se escribe un
   camino de envío nuevo.
5. Sin anuncios, la sección **no se dibuja**. No hay "aún no hay anuncios".

---

## T-032 · Quizzes

**Agente:** `nerv-web` + `nerv-arquitecto` · **Nivel:** Strong

### Por qué
En Udemy el currículum no es sólo video. En una escuela de oficios holísticos, la autoevaluación es
lo que convierte "vi el video" en "lo sé". Y es el subsistema más grande de los ocho.

### El punto arquitectónico — y es el corazón del ticket

**La respuesta correcta es un localizador pago.** Si `is_correct` viaja al cliente antes de
responder, el quiz no existe. Tiene exactamente la misma forma que `lessons.video_id` y
`lesson_resources.drive_file_id`, y le corresponde exactamente el mismo tratamiento:

> **`quiz_options.is_correct` y `quiz_options.explanation` llevan grant sólo a `service_role`.**
> Un `select *` sobre `quiz_options` desde el cliente falla con `42501`. La corrección ocurre en
> una Server Action y devuelve el resultado, nunca la clave.

Esto es ADR-003 aplicado a un dato nuevo, no una regla nueva. La razón de siempre: **RLS filtra
filas, no columnas**, y todo usuario autenticado ve las filas de cualquier curso publicado.

### Migración — cuatro tablas
```
quizzes           id, course_id, module_id, title, description,
                  status/published_at (R-4), created_at, updated_at
quiz_questions    id, quiz_id, position, prompt, multiple boolean
quiz_options      id, question_id, position, label,
                  is_correct boolean,      -- service_role ONLY
                  explanation text         -- service_role ONLY
quiz_attempts     id, quiz_id, user_id, score int, total int,
                  answers jsonb, created_at
```
`multiple` distingue una respuesta correcta de varias. **Reintentos libres**: `quiz_attempts` no
tiene unique — se guarda el historial completo.

**R-3 sobre `prompt`, `label` y `explanation`.** `explanation` es especialmente peligroso: es donde
una docente naturalmente pondría un link.

### Criterios
1. `is_correct` y `explanation` **nunca** salen a `authenticated`. Ataque obligatorio en el
   harness: `select is_correct from quiz_options` → `42501`. Sin ese ataque en verde, el ticket no
   se aprueba.
2. La corrección es una Server Action que **verifica inscripción activa** antes de corregir. Un
   quiz de un curso ajeno no se corrige.
3. El resultado muestra la explicación **sólo después** de responder.
4. Reintentos libres; se ve el historial de intentos.
5. **El quiz no cuenta para `completed` ni para el certificado.** ADR-007 no se toca — decisión 2.
   El certificado sigue derivándose sólo de lecciones al 90%.
6. Un quiz publicado con cero preguntas es incoherente: `CHECK` o guard que impida publicarlo,
   mismo patrón que `lessons_published_needs_video`.
7. Editor en el panel docente: crear quiz, preguntas, opciones, marcar correctas. Al menos una
   correcta por pregunta, garantizado por guard.
8. Borrar una pregunta con intentos registrados: **soft delete**, o el historial miente.

### Riesgo
Es el ticket más grande. Si hay que partirlo: **primero el motor** (schema + corrección + vista de
alumna con un quiz sembrado a mano), **después el editor docente**. La mitad peligrosa es la
primera; la segunda es CRUD.

---

# OLA 3 · Retención y docente

## T-033 · Mi aprendizaje y wishlist

**Agente:** `nerv-web` · **Nivel:** Advisory · **Depende de:** T-028

### Por qué
[panel/page.tsx](webApp/src/app/(app)/panel/page.tsx) son 153 líneas. El "My Learning" de Udemy es
donde una alumna vuelve todos los días: continuar, filtrar, archivar lo terminado. Y la wishlist es
lo que sostiene la intención de compra entre que alguien descubre un curso y puede pagarlo — algo
que en este producto importa doble, porque **la inscripción hoy la otorga un admin a mano**.

### Migración
- `course_wishlist (user_id, course_id, created_at, primary key (user_id, course_id))`
- `enrollments.archived_at timestamptz` — archivar es de la alumna, no cambia `status`.
  **`archived` no es un estado de inscripción**: una inscripción archivada sigue activa y da acceso.
  Meterlo en el `CHECK` de `status` rompería RLS y el certificado.

### Criterios
1. "Continuar" como acción primaria: la última lección con progreso sin completar, del curso tocado
   más recientemente.
2. Filtros por en curso / completados / archivados, en `searchParams` (misma doctrina que T-019:
   enlazables, con el botón atrás funcionando).
3. Archivar y desarchivar. Archivado **no pierde acceso** y el certificado sigue válido.
4. Progreso por curso con lecciones completadas sobre publicadas — se deriva, no se guarda.
5. Wishlist desde la card del catálogo y desde la ficha; sección propia en el panel. Requiere
   sesión; sin sesión, el botón lleva a `/entrar` con retorno.
6. Panel vacío con salida al catálogo, no un vacío mudo.
7. La wishlist **no filtra nada**: es `(user_id, course_id)` de cursos publicados. Sin texto libre,
   sin R-3 que aplicar.

---

## T-034 · Panel docente con métricas

**Agente:** `nerv-web` · **Nivel:** Advisory · **Depende de:** T-028, T-030, T-031
**Absorbe T-025.**

### Por qué
Hoy el panel docente es "tus cursos": alta y edición, sin una sola señal de si algo funciona. Una
docente no puede mejorar lo que no ve. Es el último de la lista porque **necesita que existan los
datos que muestra** — sin reseñas, sin Q&A y sin anuncios, un panel de métricas dibuja ceros.

### Sin migración
Todo se deriva de lo que las siete fichas anteriores ya crearon. Si acá aparece la necesidad de una
columna, es señal de que algo se derivó mal antes.

### Criterios
1. Por curso: inscriptas activas, progreso promedio, lecciones completadas, rating y nº de reseñas.
2. **Cola de trabajo**, que es lo único que convierte un panel en una herramienta: preguntas sin
   responder (T-030) y reseñas nuevas (T-028), con link directo a responder.
3. Publicar anuncios (T-031) desde el mismo lugar.
4. Cada docente ve **sólo lo suyo**, y lo impide RLS (**R-6**). Ataque al harness: pedir métricas
   de un curso ajeno.
5. **Ningún dato personal de más.** Progreso agregado, no "qué vio Delfina el martes". Un panel de
   métricas es el lugar clásico donde se filtra de a poco lo que RLS defendió bien en otro lado.
6. **La sección de cobros no se dibuja** hasta que exista T-026. Criterio heredado de T-025: no se
   deja un lugar vacío prometiendo algo que no está.
7. Sin datos —curso recién publicado— se ve deliberado, no roto.

---

## Lo que este documento deja afuera, a propósito

- **T-024 carta natal** — bloqueado por Q-09 (AGPL con copyleft por red). Sin relación con Udemy.
- **T-026 cobro y split 8%** — bloqueado por Q-10. T-034 c.6 le deja el hueco preparado.
- **Portadas y fotos** — §4, decisión 1.
- **Marcado manual de completado** — ADR-007, decisión 2.
- **Exámenes cronometrados y entregas corregidas** — decisión 4 acotó quizzes a opción múltiple.
- **Votos en reseñas y en Q&A** — YAGNI hasta que haya volumen que ordenar.
- **App móvil y descarga offline** — `mobileApp/` es un directorio vacío y está fuera de Fase 2.

## Preguntas abiertas que abre esta spec

- ~~**Q-11**~~ · **CERRADA 2026-09-10 por ADR-012**: modera quien no es el sujeto. La guía
  responde y reporta; oculta el admin. El default que traía esta spec —"sí, con autor y motivo
  registrados"— quedó descartado: un rastro sólo sirve si alguien lo audita.
- **Q-12** · ¿El mail de anuncio (T-031 c.4) va por `mail_log` con el mismo tope de intentos, o
  necesita su propia política de tasa por ser de difusión y no transaccional?
