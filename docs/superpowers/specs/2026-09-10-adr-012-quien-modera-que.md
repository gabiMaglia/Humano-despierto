# ADR-012 · Quién modera qué — spec

**Fecha:** 2026-09-10 · **Autoridad:** ADR-012 en `engram/02_architecture.md`
**Origen:** Q-11, cerrada investigando el rubro. Resuelve además una contradicción viva.
**Nivel:** Strong — permisos sobre contenido de personas.

## El problema

Hoy conviven dos reglas de moderación que se contradicen, y ninguna está escrita como doctrina:

| Contenido | Quién modera hoy | Migración |
|---|---|---|
| Hilo de curso en Campus | **la guía dueña del curso** | `0014` · `is_campus_moderator` |
| Hilo general de Campus | el admin | `0014` |
| Reseñas de curso | **sólo el admin** — la guía no puede | `0024` |

Las dos se decidieron por separado y con buen criterio cada una. Pero **T-030 (Q&A por lección)
está en el backlog y no tiene forma de elegir** sin una regla escrita, y lo mismo va a pasar con
T-031.

## Lo que hace el rubro

- **Foros y discusiones** — la instructora modera. Es universal: Blackboard, edX y Canvas tienen
  rol explícito de *discussion moderator* para el equipo docente. Se entiende como función
  pedagógica: mantener el hilo enfocado es parte de enseñar.
- **Reseñas** — la instructora **nunca** borra. Udemy la deja **responder en público**; Skillshare
  la deja **reportar** a un equipo de moderación de la plataforma. Ninguna de las dos le da el
  borrado.

El rubro entero hace la misma distinción. No es una elección de gusto.

## Decisión

> **Modera quien no es el sujeto.**

Un mensaje de foro es *sobre el material*. Una reseña es *sobre la guía*. Moderar spam en tu aula
no es lo mismo que borrar críticas a vos, y el conflicto de interés sólo existe en el segundo caso.

De ahí salen tres reglas:

**1 · Contenido sobre el material ⇒ la guía dueña modera.**
Campus de curso (ya es así, queda **justificado y no tolerado**) y **T-030 Q&A por lección, que
queda decidido: la guía modera**. Una pregunta sobre el minuto 12 no es sobre ella.

**2 · Contenido sobre la guía ⇒ sólo el admin modera.**
Reseñas. La guía tiene dos recursos y ninguno es el borrado:
- **responder en público**, una vez (ya implementado en `0024`);
- **reportar al admin**, que es lo que este ticket construye.

**3 · Contenido sin dueño ⇒ el admin.**
Hilo general de Campus. Ya es así.

### Por qué se descartó el registro auditable

La spec de T-028 traía "la guía modera con autor y motivo registrados". Se descartó por un motivo
concreto: **un rastro auditable sólo sirve si alguien lo audita**, y en una escuela con tres guías
nadie va a auditar a la dueña del curso. Quitar la capacidad no depende de que haya un auditor;
registrarla, sí.

## El mecanismo que falta: reportar

Hoy una guía que recibe una reseña **genuinamente abusiva** —insultos, datos personales de
terceros, algo que no es una opinión sobre el curso— tiene un solo recurso: responder en público,
que **amplifica**. Ese hueco es real y lo cierra este ticket.

### Migración — `course_review_reports`

```sql
create table public.course_review_reports (
  id           uuid        primary key default gen_random_uuid(),
  review_id    uuid        not null references public.course_reviews (id) on delete cascade,
  reporter_id  uuid        not null references public.profiles (id) on delete cascade,
  reason       text        not null,
  created_at   timestamptz not null default now(),
  -- Resolucion del admin. El trio va junto o no va: mismo CHECK de consistencia que el resto.
  resolved_at  timestamptz,
  resolved_by  uuid        references public.profiles (id) on delete set null,
  resolution   text        check (resolution in ('oculta', 'desestimada')),

  constraint course_review_reports_unique unique (review_id, reporter_id),
  constraint course_review_reports_reason_not_blank check (length(btrim(reason)) > 0),
  constraint course_review_reports_reason_max check (char_length(reason) <= 1000),
  constraint course_review_reports_resolution_consistency check (
    (resolved_at is null) = (resolved_by is null)
    and (resolved_at is null) = (resolution is null)
  )
);
```

**`on delete cascade` desde `course_reviews`** y no `set null`: un reporte sobre una reseña que ya
no existe no le sirve a nadie. Ojo con la lección de `0017` — verificar que el guard de
`course_reviews` **no bloquee** ese borrado en cascada (checklist de ADR-011, pregunta 1).

**`unique (review_id, reporter_id)`**: una persona reporta una vez. Sin esto, reportar en bucle es
la forma barata de presionar al admin.

**`reason` NO lleva ADR-009.** Es la excepción de este ticket y hay que justificarla: el reporte
**no es público** —lo leen el admin y nadie más— así que la mitad de forma no aplica. Pero **sí
lleva la mitad exacta**: nada impide que alguien use el campo de motivo para exfiltrar un
`video_id` si mañana el reporte se muestra en algún lado. Es barato y cierra la puerta antes de
que se abra.

### Quién reporta

**La guía dueña del curso y el admin.** No la alumna.

Es una decisión, no un olvido: el reporte existe para el conflicto de interés que la regla 2 creó
—le sacamos a la guía el borrado, le damos el reporte—. Abrirlo a cualquier usuario convierte esto
en un sistema de denuncias comunitario, que es un producto distinto y necesita defensas contra el
brigading que acá no existen. **Si más adelante hace falta, se abre; hoy no.**

### El flujo

1. La guía ve una reseña de su curso en la ficha o en su panel y la reporta con un motivo.
2. El reporte aparece en la cola del panel admin, junto a la reseña completa.
3. El admin resuelve: **oculta** (escribe `hidden_*` en la reseña, por `service_role`) o
   **desestima**. En los dos casos queda `resolved_by` y `resolution`.
4. La guía ve el estado de sus reportes en su panel. **No ve quién resolvió ni el motivo interno**
   — sólo si se ocultó o se desestimó.

**Sin mail al admin en este ticket.** T-020 costó ocho rondas y cada mail nuevo es superficie.
Con el volumen actual, una cola visible en el panel alcanza. Si algún día hay volumen que lo pida,
se suma reusando `mail_log` — que es la razón por la que esa capa existe.

## Criterios de aceptación

1. ADR-012 en `engram/02_architecture.md` con la regla **modera quien no es el sujeto** y las tres
   consecuencias. **Campus no se toca** — queda explícitamente justificado.
2. **T-030 queda decidido en el ADR**: en el Q&A por lección modera la guía dueña. La ficha de
   T-030 en el backlog se actualiza para apuntar al ADR en vez de volver a decidirlo.
3. `course_review_reports` con RLS: **inserta la guía dueña del curso de esa reseña, o el admin**.
   Lo impide RLS, no el formulario.
4. Lee el reporte quien lo escribió y el admin. **Ninguna alumna ve reportes**, ni siquiera los de
   su propia reseña — saber que fue reportada no le aporta nada y sí invita a la escalada.
5. `resolved_*` fuera de todo grant de cliente: lo escribe `service_role` desde un Server Action que
   ya verificó admin. Mismo patrón que `hidden_*` en `0024`.
6. Ocultar desde la resolución del reporte **reusa el camino de `0024`**, no uno nuevo. Un segundo
   camino para ocultar es un segundo lugar donde equivocarse.
7. Un reporte sobre una reseña borrada desaparece con ella, y **el borrado no queda bloqueado por
   ningún guard** — verificado, no asumido (ADR-011 · pregunta 1, lección de `0017`).
8. Ataques nuevos en `b1-postgrest-attacks.sh` (R-6): reportar una reseña de un curso ajeno ·
   reportar dos veces · escribir `resolved_*` desde un cliente · una alumna leyendo reportes.
9. Cola vacía en el panel admin **se ve deliberada**, no rota. Es el estado normal y esperable.
10. `npm test`, B-1 y el resto de los verificadores en verde.

## Riesgo declarado

**Le agrega una cola de trabajo al admin que hoy no existe.** Es el costo directo de la regla 2:
al quitarle el borrado a la guía, alguien tiene que resolver. Con tres guías y pocas reseñas el
volumen va a ser cercano a cero, y ése es justamente el momento correcto para construirlo — antes
de necesitarlo con urgencia.

Si la cola creciera al punto de ser un problema, la salida **no** es devolverle el borrado a la
guía: es sumar criterios de auto-desestimación (reportes sobre reseñas de 4-5 estrellas, por
ejemplo). Queda anotado, no construido.
