# R-01 · El rating llega al catálogo — spec

**Fecha:** 2026-09-10 · **Origen:** `2026-09-09-auditoria-post-ola-1.md` · **Cierra:** T-028 c.4
**Nivel:** Advisory · **Sin migración** · **Tamaño:** medio día

## El problema

T-028 construyó reseñas y rating, y **el dato vive sólo en la ficha del curso**. Medido:
`getPublishedCourses` no trae rating y `/cursos` no lo muestra ni ordena por él.

Alguien que llega a `/cursos` ve nueve tarjetas sin ninguna señal de calidad y tiene que entrar a
cada una para saber cuál vale la pena. **La prueba social que T-028 construyó no aparece donde se
decide qué abrir**, que es exactamente el lugar donde Udemy la pone. Es deuda mía, no un recorte de
alcance.

## Decisión

Tres piezas, ninguna con migración:

1. `PublishedCourseSummary` suma `rating` y `reviewCount`, **derivados**.
2. `CourseCard` los muestra, y **omite la señal entera cuando no hay reseñas**.
3. `orden=mejor-valorado` se suma a los `searchParams` que T-019 ya maneja.

## Diseño

### 1 · El agregado, derivado y en una sola consulta

`getCourseReviews` (T-028) ya deriva promedio y distribución **para un curso**. Acá hacen falta los
promedios de **todos** los publicados a la vez, y llamar a esa función N veces es N+1 consultas
contra una página que ya carga nueve cursos.

Hay dos caminos defendibles y conviene ser explícito, porque el reflejo —copiar
`course_student_count` de T-027— **no es el correcto acá**: aquella función existe porque `anon`
NO puede leer `enrollments`, y en cambio la política `course_reviews_read` sí le deja leer
`course_reviews`. La restricción que justificaba una función allá no existe acá.

- **(a) Agregar en SQL** con una función que devuelva `(course_id, average, total)`. Una consulta,
  el motor promedia, no viaja ni una fila de reseña.
- **(b) Agregar en TypeScript** con un `select course_id, rating` sobre las reseñas de los cursos
  visibles y un `reduce`. Cero SQL nuevo, cero función que declarar y justificar en
  `rls-mutation.test.mjs`.

**Recomiendo (b) para este ticket.** Con nueve cursos y pocas reseñas por curso, el volumen es
trivial; `rating` es una columna que `anon` ya puede leer, así que no hay superficie nueva; y evita
sumar una función `security definer` más —cada una hay que declararla y **justificarla a mano** en
el test de EXECUTE, que es fricción deliberada y sólo se paga cuando hace falta.

**El umbral en el que (b) deja de servir queda escrito:** cuando un curso pase las ~200 reseñas o
el catálogo los 100 cursos. Ahí se cambia a (a), y este párrafo es el aviso.

### 2 · La tarjeta

`CourseCardData` suma dos campos opcionales:

```ts
rating?: number;       // promedio 1..5, una decimal
reviewCount?: number;  // total de reseñas visibles
```

**Opcionales a propósito**: `CourseCard` la usa también la landing (`FeaturedCourses`), y no hace
falta que todos los call sites traigan el dato el día uno.

**Cuando no hay reseñas, no se dibuja nada.** Ni `0.0`, ni cinco estrellas vacías, ni "sin
reseñas". Es el mismo criterio que la ficha ya respeta (T-028 c.3) y por el mismo motivo: **un
curso nuevo y un curso malo no se pueden ver igual**. En una tarjeta el riesgo es peor que en la
ficha, porque ahí no hay contexto que lo matice.

Reusar el componente `Stars` que T-028 ya construyó — es §4 puro y ya lleva el valor en `.sr-only`.
**No escribir un segundo renderizador de estrellas.**

### 3 · El orden

`catalog-filters.ts` ya tiene la forma correcta: `CatalogFilterState`, `parseCatalogFilterState`,
`filterCourses`, y los helpers de URL. El orden entra ahí y en ningún otro lado.

```ts
export type CatalogOrder = "relevancia" | "mejor-valorado" | "mas-nuevo";
```

- `relevancia` — el orden actual. **Es el default y no cambia**: un cambio de default reordena el
  catálogo para todo el mundo, y eso no es lo que pide este ticket.
- `mejor-valorado` — por promedio descendente.
- `mas-nuevo` — por `published_at` descendente. Entra porque un selector de orden con **una sola
  opción alternativa** se ve incompleto, y `published_at` ya está en el tipo.

**El desempate es la parte que hay que decidir y no improvisar.** Un curso con una sola reseña de
5★ no puede ganarle a uno con cuarenta reseñas de 4.8★ — es el modo de falla clásico de ordenar por
promedio crudo.

**Regla:** ordenar por promedio descendente, **y a igual promedio, por cantidad de reseñas
descendente**; los cursos sin reseñas van al final, en el orden que ya tenían. Es simple,
reproducible a mano y explicable.

**Lo que NO se hace:** puntaje bayesiano ni ponderación por recencia. Con menos de veinte reseñas
por curso agrega opacidad sin agregar precisión, y un orden que nadie puede reproducir mirando los
números genera desconfianza. Queda anotado para cuando algún curso pase las 50 reseñas — la misma
conclusión a la que llegó R-03 de la auditoría sobre el promedio.

### 4 · La UI del selector

Un `FilterGroup` más en la barra lateral no sirve: el orden es **excluyente** y los filtros son
acumulativos, y el componente existente dibuja casillas. Va como un grupo de enlaces arriba de la
grilla, con el activo marcado por `aria-pressed`, usando `hrefFor` y un helper nuevo
`withParam(current, "orden", valor)` — hermano de `withoutParam`, que ya existe.

## Criterios de aceptación

1. La tarjeta de curso muestra promedio y cantidad de reseñas cuando las hay, con el componente
   `Stars` de T-028.
2. **Sin reseñas no se dibuja nada** — ni `0.0`, ni estrellas vacías, ni texto de relleno.
   Verificado en el navegador con un curso de cada tipo.
3. `orden=relevancia|mejor-valorado|mas-nuevo` en `searchParams`: enlazable, con el botón atrás
   funcionando, y **combinable con los filtros y la búsqueda que ya existen** sin romperlos.
4. `relevancia` sigue siendo el default y el orden actual no cambia para quien no elige nada.
5. El desempate es el declarado: promedio ↓, luego cantidad ↓, luego los sin reseñas. **Hay un test
   de la función de orden con un caso de empate**, porque es la única parte con lógica real.
6. Los números de la tarjeta **coinciden con los de la ficha** del mismo curso. Misma lección que
   T-019 c.2: un número que no coincide es peor que ningún número.
7. Un curso sin reseñas es alcanzable con `orden=mejor-valorado` — **no desaparece del catálogo**,
   va al final.
8. `tsc`, `lint`, `check-seo.sh` y `check-adr004.sh` en verde. El catálogo es ruta pública.

## Testing

`webApp` no tiene runner de tests (D-10 / N-02 de la auditoría), así que lo que se puede probar
automáticamente es lo que ya se prueba: `tsc`, `lint` y los scripts sobre HTTP.

**Excepción que vale la pena:** la función de orden es lógica pura sobre un array, sin React ni
base de datos. Si D-10 se resuelve antes que este ticket, es el primer candidato natural. Si no,
**el criterio 5 se verifica a mano con un caso de empate construido en el seed** y se documenta en
el commit cómo se verificó — no se declara verde sin haberlo mirado.

## Lo que este ticket NO hace

- **No agrega "reseña destacada" a la tarjeta.** El espacio de una card no da y la ficha ya la
  tiene.
- **No agrega filtro por rating mínimo** ("4★ o más"). Con nueve cursos no filtra nada útil.
- **No toca el default del orden.**
- **No resuelve R-02** (el empujón para dejar reseña). Es otro ticket y vive en el mail de T-020 y
  en el player de T-029.
