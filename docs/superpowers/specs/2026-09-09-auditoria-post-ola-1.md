# Auditoría post-Ola 1 — qué falta ahora

**Fecha:** 2026-09-09 · **Rama:** `fix/auditoria-seo-a11y` · **Base:** `86d8ef3`
**Cubre:** el estado después de ejecutar el plan de auditoría (SEO/a11y/higiene), T-027 y T-028.
**Documentos previos:** `2026-09-09-auditoria-pre-produccion.md` · `2026-09-09-paridad-udemy-design.md`

> Medido, no recordado. Donde no pude medir, lo dice.

## Estado real, contra el estado al empezar

| | Al empezar (`86d8ef3`) | Ahora |
|---|---|---|
| LOC en `webApp/src` | 12.552 | **13.455** |
| Rutas (`page.tsx`) | 22 | 22 |
| Componentes | 44 | **53** |
| Migraciones | 22 | **23** (nuevas: `0023`, `0024`) |
| Tablas | 13 | **14** (`course_reviews`) |
| Tests de mutación | 384 | **422** |
| Verificadores | 3 | **4** (suma `check-seo.sh`) |
| Rutas con metadata | 2 de 22 | **9 de 22** (las 9 públicas) |

22 commits. Los cinco verificadores en verde: 422/422 · B-1 OK · ADR-004 12/12 con sesión ·
SEO OK · `tsc` y `lint` limpios.

---

## 1 · Lo que se cerró

| Hallazgo | Estado |
|---|---|
| **S-05** localizadores exactos sin cubrir en `courses` | **CERRADO.** `0023` suma el guard. 5 ataques nuevos en B-1. |
| **E-01** SEO: sin sitemap, sin robots, 2/22 con metadata | **CERRADO** y con verificador propio. |
| **X-01** a11y de acordeón y player | **CERRADO** en lo medible. Ver X-01b abajo. |
| **C-02** links muertos | **CERRADO.** Eran 4, no 1. |
| **A-03** `engines.node` sin declarar | **Declarado.** El upgrade en sí sigue pendiente. |
| **S-04** sin cabeceras de seguridad | **4 de 5.** Falta CSP. |
| **Q-11** ¿la guía modera sus reseñas? | **RESUELTA** investigando Udemy: responde, no oculta. |

### Dos agujeros que encontraron los tests, no yo

Vale registrarlos porque los dos son de la misma familia y los dos se me escaparon al diseñar:

1. **La guía podía cambiar el rating que le pusieron.** Los grants separan columnas **por rol**, y
   ahí autora y guía son el mismo rol (`authenticated`) sobre la **misma fila**; RLS separa filas,
   no columnas. La única capa que distingue "quién sos respecto de *esta* fila" es el guard.
2. **El guard bloqueaba a `service_role`, dejando la moderación inalcanzable.** Es literalmente el
   bug que la migración `0017` ya había tenido que reparar en `certificates`. **El proyecto lo
   cometió dos veces**; conviene que la próxima tabla con guard lo mire desde el principio.

---

## 2 · Lo que falta para Udemy — actualizado

De las 8 fichas de la spec, **2 hechas, 6 pendientes**:

| Ticket | Estado |
|---|---|
| **T-027** Ficha completa | **HECHO** |
| **T-028** Reseñas y rating | **HECHO, con una parte sin cerrar** (ver R-01) |
| T-029 Player continuo | pendiente |
| T-030 Q&A por lección | pendiente |
| T-031 Anuncios de la guía | pendiente |
| T-032 Quizzes | pendiente |
| T-033 Mi aprendizaje + wishlist | pendiente |
| T-034 Panel docente con métricas | pendiente |

### R-01 · El rating no llegó al catálogo — **ALTO**, y es deuda mía

*Medido: `getPublishedCourses` no trae `rating`; `/cursos` no ordena por él.*

T-028 c.4 pedía orden "mejor valorado" en el catálogo. **No está.** El rating vive sólo en la
ficha del curso.

Por qué importa más de lo que parece: alguien que llega a `/cursos` ve nueve tarjetas sin ninguna
señal de calidad y tiene que entrar a cada una. La prueba social que T-028 construyó **no aparece
donde se decide qué abrir**, que es justo el lugar donde Udemy la pone.

**Acción:** sumar `rating`/`total` a `PublishedCourseSummary` (agregado derivado, misma doctrina),
mostrarlos en `CourseCard`, y sumar `orden=mejor-valorado` a los `searchParams` que T-019 ya
maneja. Es chico — media jornada — y cierra el ticket de verdad.

### R-02 · Sin empujón para dejar reseña — **MEDIO**

Udemy pide la puntuación tras 12–15 minutos de video, y esa es la razón por la que tiene volumen
de reseñas. Acá el formulario existe pero **hay que ir a buscarlo a la ficha del curso**, que es
adonde una alumna inscripta ya no vuelve.

El mail de curso completado (T-020) es el gancho natural y ya existe — sumarle el link es barato.
El empujón dentro del player es de T-029.

### R-03 · Promedio plano, sin recencia — **BAJO, y probablemente correcto así**

Udemy pondera por recencia (ventana de 90 días) y por cuánto del curso consumió quien puntúa. Acá
el promedio es plano.

**Recomiendo dejarlo plano.** Con menos de 20 reseñas por curso, ponderar agrega opacidad sin
agregar precisión, y un promedio que nadie puede reproducir a mano genera desconfianza. Revisar
cuando algún curso pase las 50 reseñas.

---

## 3 · Deuda nueva, introducida en esta sesión

### N-01 · Borré los fixtures manuales de la base local — **ALTO para vos, hoy**

`npx supabase db reset` (necesario tres veces: los grants de columnas nuevas no se aplican sin
re-correr las migraciones) **borró `admin@`, `docente@` y `alumna@test.local`**, que no están en
`seed.sql` — se habían creado a mano. `_state.md` los documenta como si existieran.

Los del seed sí sobrevivieron y sirven para todo:

| Cuenta | Rol | Contraseña |
|---|---|---|
| `sol.mayor@seed.humano.local` | teacher | `seed-teacher-1234` |
| `delfina.curso-completo@seed.humano.local` | student | `seed-student-1234` |

**Acción recomendada, y es más que reponerlos:** meter los tres en `seed.sql`. Un fixture que sólo
existe porque alguien lo creó a mano una vez es un fixture que se pierde en el próximo reset —
esta sesión es la prueba.

### N-02 · `webApp` sigue sin runner de tests, y ahora pesa más — **ALTO**

Era D-10. Sumé **9 componentes y 2 Server Actions sin un solo test automatizado**: `ReviewForm`,
`ReviewsSection`, `Stars`, `saveReviewAction`, `respondReviewAction` y los campos nuevos del
formulario docente.

Lo que los cubre hoy: `tsc`, `lint`, 4 scripts sobre HTTP servido, y que yo abrí las páginas.
**Nada de eso prueba que el formulario de reseña guarde.** Lo verifiqué a mano; nadie lo va a
volver a verificar solo.

Sigue siendo decisión tuya (es un ADR), pero la relación costo/beneficio empeoró: cada ticket de
las Olas 2 y 3 suma componentes interactivos, que es exactamente lo que ningún verificador actual
toca.

### N-03 · Los Server Actions de reseña no tienen rate limiting — **MEDIO**

Son 2 de las ahora **8** Server Actions. S-02 sigue abierto y ahora tiene dos blancos más. El de
reseñas está acotado por el `unique (user_id, course_id)` —no se puede inundar la tabla— pero
editar la propia reseña no tiene tope.

---

## 4 · Lo que sigue abierto de la auditoría original

Sin cambios, y **cuatro siguen bloqueando el release**:

| | Estado |
|---|---|
| **A-01** el schema nunca corrió contra Postgres real | **BLOQUEANTE.** Sigue. Ahora con 23 migraciones y 2 tablas más que verificar. |
| **A-02** falta `YOUTUBE_API_KEY` | **BLOQUEANTE.** Sigue. |
| **S-01** el residuo de `0009` con certificados vivos | **BLOQUEANTE y es tu decisión.** Sin tocar. |
| **D-01** backup/restore nunca probado | **BLOQUEANTE.** Sigue, y ahora hay reseñas de personas reales que perder. |
| **S-02** rate limiting | Abierto, y creció (N-03). |
| **S-03** D-06 OpenAPI | Abierto. Se cierra contra la instancia real. |
| **O-01** observabilidad | Abierto. 22 `console.*`, cero captura de errores. |
| **X-01b** a11y nunca corrió con axe | Ver abajo. |
| **E-02** Open Graph sin imagen | Abierto. Necesita tu OK sobre §4. |
| CSP | Abierto. |

### X-01b · Lo que la a11y de esta sesión **no** prueba

Arreglé lo que medí: roles ARIA, glifos rotulados, `title` del iframe, `.sr-only`. Todo verificado
**sobre el HTML servido**.

**No corrí axe y no tabulé la interfaz con un teclado real.** No hay navegador automatizado en el
entorno. Que los atributos estén bien puestos no prueba que el foco sea visible sobre `#0a0418`,
ni que el orden de tabulación tenga sentido, ni que un lector de pantalla lea algo coherente.

Y hay **9 componentes nuevos sin revisar** de esta misma sesión.

---

## 5 · Prioridad recomendada

**Antes de producción, sin excepción:** A-01 · A-02 · **S-01 (tuya)** · D-01.

**Después, en este orden y con este fundamento:**

1. **R-01, el rating en el catálogo.** Es medio día y desperdicia menos: T-028 ya construyó el
   dato y hoy no se ve donde más pesa.
2. **N-01, los fixtures al `seed.sql`.** Es media hora y te desbloquea a vos, hoy.
3. **O-01, observabilidad.** Es lo que más se necesita el día uno y lo único que no se puede
   agregar después del incidente.
4. **N-02, el runner de tests.** Antes de la Ola 2, no después: cada ticket que viene suma
   componentes interactivos sin cobertura.
5. **T-029, player continuo.** De los seis pendientes es el que más cambia la sensación de
   producto y el que menos backend necesita.

## Preguntas que siguen esperándote

- **S-01** · intervalos reproducidos, o aceptación explícita dicha en la página del certificado.
- **Q-12** · el mail de anuncio (T-031) ¿va por `mail_log` con el mismo tope de intentos, o
  necesita política propia por ser difusión y no transaccional?
- **D-10 / N-02** · qué runner de tests para `webApp`.
- **E-02** · `opengraph-image.tsx` genera un PNG desde JSX, sin pipeline ni almacenamiento.
  ¿Cuenta como violación de §4 o no?
