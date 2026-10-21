# Cierre funcional: spec maestro

**Fecha:** 2026-10-21 · **Base:** `fix/auditoria-seo-a11y` (`4bd9f27`) · **Ejecuta:** Opus vía handoffs NERV
**Objetivo del bloque:** que la plataforma quede **terminada en funcionalidad** al nivel de Udemy
(sin pagos, sin quizzes). El reskin visual se ataca en otro bloque y no se mezcla con éste.

Este documento fija decisiones, orden y reglas. Cada sub-proyecto tiene su spec hermano
`2026-10-21-SP-N-*.md` con tickets, migraciones y criterios Gherkin. **Los sub-specs no
re-litigan nada de lo que está acá.**

## Decisiones del PO (2026-10-21)

| # | Tema | Decisión |
|---|---|---|
| D1 | Pagos | **Fuera.** Es lo último del proyecto. Q-03 y Q-10 siguen abiertas. |
| D2 | Inscripción | **Solicitud + aprobación del admin.** El alumno pide desde la ficha, queda pendiente, el admin aprueba desde su panel, sale mail. El checkout maqueta desaparece. Cuando lleguen los pagos, el webhook reemplaza el click del admin. |
| D3 | Paridad Udemy | Entran **Q&A por lección (T-030), anuncios (T-031), wishlist + Mi aprendizaje (T-033)**. Quizzes (T-032) **no**. |
| D4 | Nube | **Todo sigue local.** Más adelante: Supabase cloud sí, Vercel no (es sitio comercial), **Resend** para mail. El transporte de mail se diseña ya con adaptador Resend detrás de la interfaz actual. |
| D5 | Google OAuth | **Sí.** |
| D6 | Perfil (cierra Q-11) | Nombre, avatar, bio, teléfono, **fecha de nacimiento**. La fecha es dato sensible: se puede borrar, nunca se expone en páginas públicas. |
| D7 | S-01 | Camino 1, ya decidido el 2026-10-20: el certificado acredita recorrido completo, no evaluación. Se declara en la página del certificado. ADR-013. |
| D8 | Q-12 | Confirmar mail antes de tener sesión (`enable_confirmations = true`). |
| D9 | D-10 | Vitest para unidades + Playwright mínimo para los flujos críticos. |

### Supuestos declarados del equipo (P-3): el PO los puede vetar en la revisión del spec
- **S-A · Raster para contenido subido por usuarios.** La spec de paridad (2026-09-09) decía
  "sin portada ni foto de guía" por §4. Como el reskin ya está decidido y va a retirar §4, este
  bloque **sí** incorpora portada de curso y avatar (Supabase Storage). El ADR que retire §4
  formalmente se escribe en el bloque de reskin; acá sólo se registra la excepción.
- **S-B · ADR-007 intacto: no hay "marcar como completada" manual.** Udemy lo tiene; acá
  `completed` sigue derivada al 90%. El player gana "siguiente lección" y estado visible, no un
  botón que declare. Cambiarlo requiere ADR.
- **S-C · Moneda ARS** sigue siendo el default de `price_cents` (Q-03 abierta).
- **S-D · Un sólo bucket privado** `uploads` con rutas por tipo (`avatars/<uid>/`,
  `covers/<course_id>/`), servido vía URL firmada o transformación pública según el caso.

## Fuera de alcance (no se discute por ticket)
Pagos · quizzes · carta natal (Q-09) · nube y deploy · reskin · mobileApp.

## Sub-proyectos, orden y tickets

| SP | Nombre | Tickets | Depende de | Paralelizable con |
|---|---|---|---|---|
| **SP-0** | Higiene y base | T-038 higiene de repo · T-039 runner de tests |: | nada: va primero |
| **SP-1** | Cuenta | T-040 reset + confirmación + `?next=` · T-041 Google OAuth · T-042 perfil editable + avatar | SP-0 | SP-3 |
| **SP-2** | Inscripción por solicitud | T-043 | SP-1 (mails) | SP-3 |
| **SP-3** | Alumno completo | T-044 recursos descargables · T-045 player UX · R-01 rating al catálogo · T-046 notas en el panel | SP-0 | SP-1, SP-2 |
| **SP-4** | Docente y admin completos | T-047 portada de curso · T-048 alumnos y métricas (absorbe T-025 y T-034) · T-037 moderación de reseñas · T-049 invitación de docentes + búsqueda/paginación admin | SP-1 (Storage), SP-2 (cola) | SP-5 |
| **SP-5** | Paridad Udemy | T-030 Q&A · T-031 anuncios · T-033 wishlist + Mi aprendizaje | SP-1 (mails), SP-3 (player) | SP-4 |
| **SP-6** | Robustez | T-050 rate limiting · T-051 errores y logs · T-052 CSP + OG + `not-found` · T-053 landing sin mocks · T-054 transporte Resend (ADR-014) | todo lo anterior |: |

**Orden de ejecución:** SP-0 → (SP-1 ‖ SP-3) → SP-2 → (SP-4 ‖ SP-5) → SP-6.
"‖" sólo si los archivos son disjuntos (P-24); el orquestador lo verifica antes de abrir dos
handoffs. Dentro de un SP los tickets van en el orden de la tabla.

**Niveles P-11 provisionales:** todo lo que toque auth, PII, migraciones o permisos es
**Strong** (CÓMO obligatorio en `engram/plans/<T-ID>.md`). T-040, T-041, T-042, T-043, T-044,
T-054 nacen Strong. Lo que toque un ADR es Adversarial (T-038 por ADR-013, T-054 por ADR-014).
El gate recalcula después; el estimado sólo sirve para exigir el plan antes de codear.

## Migraciones
El número se asigna **al arrancar el ticket** mirando `schema_migrations` real (lección de
Sprint 2). Los timestamps se reservan acá, ascendentes en el orden de ejecución:

| Ticket | Timestamp reservado |
|---|---|
| T-038 (fixtures en seed, sin migración) |: |
| T-042 perfil | `20261021120000` |
| T-043 solicitudes | `20261021130000` |
| T-044 recursos (si hace falta) | `20261021140000` |
| T-047 portada | `20261021150000` |
| T-037 moderación | `20261021160000` |
| T-049 invitaciones | `20261021170000` |
| T-030 Q&A | `20261022120000` |
| T-031 anuncios | `20261022130000` |
| T-033 wishlist | `20261022140000` |
| T-050 rate limiting (si persiste en DB) | `20261022150000` |

## Reglas transversales: valen para los 7 sub-specs
Son las que ya defiende el schema. Se citan, no se re-derivan.

- **R-1 · Grants como whitelist.** Columna nueva nace sin exponer; se agrega a mano en `0003`.
  `REVOKE ALL` + `GRANT` por columna, nunca revoke de una columna.
- **R-2 · RLS lee `profiles.role`**, nunca el claim del JWT.
- **R-3 · ADR-009/010 sobre todo texto libre nuevo** que se sirva a `anon` o a otros usuarios:
  `text_has_locator` (forma) **y** `body_has_known_locator` (exacta). Pregunta, respuesta,
  anuncio, bio, nombre: todos.
- **R-4 · `status` y `published_at` son del servidor**, fuera de los grants del cliente.
- **R-5 · Soft delete con trío** (`deleted_at`, `deleted_by`, `deleted_reason`) y `CHECK` de
  consistencia, en todo contenido moderable. ADR-012: modera quien no es el sujeto.
- **R-6 · Cada ticket suma sus ataques** a `harness/b1-postgrest-attacks.sh` y sus casos a
  `supabase/tests/`. "RLS lo impide" sin ataque no está probado.
- **R-7 · Guard triggers según ADR-011:** checklist + prueba del camino legítimo.
- **R-8 · Localizadores pagos sólo por `service_role`** (`video_id`, `drive_file_id`, `url`),
  servidos desde Server Action tras verificar inscripción.
- **R-9 · Enteros en unidad mínima**, formateo en la vista. Fechas en UTC.
- **R-10 · Server Components por defecto.** `'use client'` sólo para interactividad.
- **R-11 · Rutas nuevas con metadata, robots y a11y** como las 9 públicas (E-01/X-01 ya
  hechos): `noindex` en lo privado, `aria-label` en glifos informativos.
- **R-12 · Mails idempotentes vía `mail_log`** con la clave de deduplicación que ya usan los 4
  existentes. Fallo de mail nunca rompe la operación (lección T-020).
- **R-13 · Sin estética nueva.** Todo lo visual nuevo usa los componentes y tokens que hay
  (Cosmos). El reskin viene después y reemplaza en bloque; inventar estilo ahora es trabajo doble.
- **R-14 · TDD con prueba de rojo (P-18).** Para la webApp, a partir de T-039, Vitest para
  lógica y Playwright para el flujo del ticket cuando sea de punta a punta.

## Verificadores (gate determinista, antes de cada handoff de vuelta)
`cd webApp/supabase && npm test` · `bash webApp/supabase/harness/b1-postgrest-attacks.sh` ·
`COOKIE=… bash webApp/scripts/check-adr004.sh <url>` · `bash webApp/scripts/check-seo.sh <url>` ·
`cd webApp && npx tsc --noEmit && npm run lint` · desde T-039: `cd webApp && npm test`.

## Definición de "terminado" para este bloque
Una alumna puede registrarse con mail confirmado o Google, recuperar su clave, editar su perfil,
pedir un curso, ser aprobada, cursarlo con recursos descargables, preguntar bajo una lección,
recibir anuncios, guardar cursos, terminar y obtener certificado. Una docente puede cargar un
curso con portada, ver a sus alumnas y sus números, responder preguntas y reseñas, anunciar. Un
admin puede invitar docentes, aprobar inscripciones, moderar reseñas y buscar en sus listas.
Todo con mail real posible (Resend), sin mocks en la landing, con rate limiting y errores
capturados. **Nada de esto requiere la nube para verificarse.**
