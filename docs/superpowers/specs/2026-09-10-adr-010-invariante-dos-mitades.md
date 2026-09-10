# ADR-010 · El invariante de ADR-009 cubre sus dos mitades — spec

**Fecha:** 2026-09-10 · **Autoridad:** ADR-010 en `engram/02_architecture.md`
**Origen:** S-05 de `2026-09-09-auditoria-pre-produccion.md`
**Nivel:** Strong — toca la defensa de los localizadores pagos.

## El problema, medido

ADR-009 tiene dos mitades, y sólo una tiene invariante.

**Mitad 1 · forma.** `text_has_locator(text)` / `array_has_locator(text[])`: heurística sobre la
*apariencia* de un localizador (`://`, `www.`, una ruta, una corrida larga de alfanuméricos).
Es `immutable`, así que vive en un `CHECK`.

**Mitad 2 · coincidencia exacta.** `body_has_known_locator(text)`: busca el valor *real* de
`lessons.video_id` y de `lesson_resources.drive_file_id`/`url` dentro del texto. Lee otras tablas,
así que es `stable security definer` y **no puede ir en un `CHECK`** — va en un guard trigger.

La segunda existe porque la primera no alcanza, y eso está documentado: **un `video_id` de YouTube
son 11 caracteres sin forma de URL**, así que `text_has_locator` lo deja pasar por construcción. Es
la evasión exacta por la que QA rechazó T-022.

### Lo que falta

`tests/locator-free-text.test.mjs` tiene un invariante para la **mitad 1**, y es bueno: consulta
`pg_attribute`, arma la lista de toda columna que `anon` puede leer y el cliente escribir, y falla
si alguna no tiene su `CHECK`. Dos listas de excepción, `EXENTAS_POR_ENUM` y `EXENTAS_POR_GUARD`,
obligan a justificar a mano cada omisión.

**De la mitad 2 no hay invariante de ningún tipo.** Se aplica tabla por tabla, a quien se acuerde:

| Tabla | Guard exacto | Cuándo |
|---|---|---|
| `campus_posts` | sí | 0016 |
| `diario_posts` | sí | 0018 / 0020 |
| `courses` | sí | **0023 — recién, y por S-05** |
| `course_reviews` | sí | 0024 |
| `lessons`, `lesson_resources`, `course_modules`, `lesson_chapters`, `profiles` | **no verificado** | — |

Por eso `courses` estuvo descubierto sin que nada se quejara: **el invariante de forma pasaba en
verde**, porque `courses.intro` sí tenía su `CHECK`. El agujero no era la ausencia de una
protección; era la ausencia de *la otra* protección, y nadie estaba mirando.

Cuando lo encontré fue a mano, preparando otro ticket. **Eso no escala**: quedan seis fichas en el
backlog y cada una suma texto público nuevo.

## Decisión

Construir el invariante que falta: **por cada columna de texto que `anon` puede leer y un cliente
puede escribir, exigir que la coincidencia exacta la cubra** — sea por guard trigger o por una
exención justificada a mano.

Y hacerlo con la misma forma que el invariante de la mitad 1, no una paralela: se lee del catálogo
de Postgres, la lista de exentas se escribe a mano, y el test falla cuando aparece una columna que
nadie declaró.

### Por qué no alcanza con "acordarse"

Es literalmente lo que se venía haciendo y produjo S-05. El proyecto ya aprendió esta lección dos
veces en otro contexto —`insert-guards.test.mjs` existe porque "protegido en UPDATE, abierto en
INSERT" apareció tres veces— y la respuesta fue siempre la misma: convertir la regla en un barrido
ejecutable. Esto es ese mismo movimiento, aplicado a la mitad que quedó afuera.

## Diseño

### La consulta: qué columnas están en la clase

Reusar `columnasDeLaClase(db)`, que ya existe en `locator-free-text.test.mjs` y hace exactamente el
recorte correcto:

```
has_column_privilege('anon', reloid, attnum, 'SELECT')
  and (has_column_privilege('authenticated', reloid, attnum, 'UPDATE')
    or has_column_privilege('authenticated', reloid, attnum, 'INSERT'))
```

**No escribir una consulta nueva.** Dos consultas que definen "la clase" es cómo se llega a que una
diga que sí y la otra que no. Si hay que extenderla, se extiende la que hay.

### Detectar la cobertura de la mitad 2

Acá está la parte difícil, y hay una diferencia real con la mitad 1: **un `CHECK` es declarativo y
un trigger no**. Del `CHECK` se puede preguntar al catálogo qué columnas toca (`pg_constraint.conkey`).
De un trigger `plpgsql` sólo se puede leer el fuente.

Dos caminos, y el segundo es el que recomiendo:

**(a) Parsear el fuente del trigger.** Leer `pg_proc.prosrc` de la función del trigger y buscar
`body_has_known_locator(new.<columna>)`. Frágil por definición: `courses_locator_guard` recorre un
`array[...]` de columnas y ningún parser razonable lo va a ver. **Descartado** — y descartado con
fundamento propio: el proyecto ya tiene un test que compara un regex de la DB contra su espejo en
TypeScript, y para no parsear el fuente lo resolvió ejecutando la función real
(`locator-parity.test.mjs`). El mismo criterio aplica acá.

**(b) Probarlo, no leerlo.** Por cada columna de la clase, **intentar escribir el localizador real
del seed** y afirmar que el motor lo rechaza. Es el mismo método del barrido de la mitad 1, con
otro payload. Si la columna está cubierta —por trigger, por `CHECK`, por lo que sea— el intento
falla; si no está cubierta, pasa, y el test lo reporta.

**Recomiendo (b).** Prueba el comportamiento y no la implementación, así que sigue valiendo si
mañana la cobertura se mueve de un trigger a otro lado. Es más lento —una escritura por columna—
pero la suite entera tarda 75 segundos y esto suma unas decenas de columnas.

### La forma del test

```
tests/locator-exact-invariant.test.mjs
```

Archivo propio y no un `describe` más dentro de `locator-free-text.test.mjs`, por una razón
concreta: ese archivo ya tiene 600 líneas y **dos listas de excepción con semánticas distintas**.
Meterle una tercera lista con una tercera semántica lo vuelve el lugar donde nadie quiere tocar
nada. Los dos archivos comparten `columnasDeLaClase` por import.

**El actor por columna.** El barrido de la mitad 1 nació asumiendo que todo el catálogo lo escribe
la docente, y T-028 rompió esa asunción (`course_reviews.body` lo escribe la alumna). Ese archivo
ya se extendió para que cada entrada declare su actor. **Este test nace con eso desde el principio**
— es la corrección que ya se pagó una vez.

**Las exenciones.** Una sola lista, `EXENTAS_DE_COINCIDENCIA_EXACTA`, con un comentario por entrada
explicando por qué. Se esperan pocas y de un solo tipo: columnas cuyo dominio ya está cerrado por
regex y donde el localizador no cabe —`courses.language` (dos letras), `courses.promo_video_id`
(el mismo formato de 11 caracteres, pero **comparado contra el catálogo**, ver abajo)—.

**Un caso que hay que pensar y no dar por obvio:** `courses.promo_video_id` acepta, por diseño, un
id de YouTube de 11 caracteres. ¿Qué pasa si una docente pega ahí el `video_id` de una lección paga
de su propio curso? El formato lo permite. La spec decide: **es una exención legítima** — un video
promocional *es* un video de YouTube y bloquear los que existen en el catálogo impediría que una
docente use como adelanto un fragmento que también es lección. Pero la exención **se escribe y se
justifica**, no se deja implícita.

### Control negativo, obligatorio

Sin esto el verde no distingue "cubierto" de "el ataque estaba mal escrito":

1. Un caso que **revierta** la cobertura de una columna conocida (dropear
   `courses_locator_guard` dentro de una transacción) y afirme que el invariante **falla**.
2. Un caso de prosa legítima que **no** debe bloquearse, para que un guard goloso no dé verde.

Es la disciplina que el resto de la suite ya sigue: `locator-parity-meta.test.mjs` existe
exactamente porque un verificador que nunca se vio en rojo no prueba nada.

## Criterios de aceptación

1. El test enumera desde el catálogo de Postgres **toda** columna de texto legible por `anon` y
   escribible por un cliente. **No hay una lista de tablas escrita a mano** — esa es la parte que
   hace que S-05 no vuelva a pasar.
2. Por cada una, intenta escribir el localizador real del seed (`SECRET.videoId` y
   `SECRET.driveFileId`) **con el actor que realmente escribe esa columna**, y exige rechazo.
3. Las columnas no cubiertas fallan el test salvo que estén en `EXENTAS_DE_COINCIDENCIA_EXACTA`
   **con su comentario de justificación**.
4. Control negativo: revertir el guard de una tabla conocida hace fallar el invariante. Verificado
   en rojo antes de dar el ticket por bueno.
5. Control positivo: prosa legítima no se bloquea.
6. Toda columna que el test descubra descubierta **se cubre en este mismo ticket**, con su
   migración. Un invariante que se declara y se deja fallando no sirve de nada.
7. `npm test` en verde, con el total documentado en el commit.

## Lo que este ticket puede descubrir

**Es probable que encuentre columnas descubiertas** — `lessons.title`, `lessons.description`,
`course_modules.title/description`, `lesson_chapters.label`, `profiles.bio` y los campos públicos
de `profiles` no tienen guard exacto verificado.

Eso **no es alcance extra: es el alcance**. Si el test se escribe y todo pasa a la primera,
conviene sospechar del test antes que celebrar.

Si el número de columnas descubiertas resulta grande (más de cinco tablas), parar y avisar: puede
que la respuesta correcta sea una función genérica de guard reutilizable en vez de repetir el
mismo `plpgsql` en cada migración. **Esa decisión no se toma por adelantado acá** — depende de
cuántas sean y de si comparten forma.

## Riesgo declarado

`body_has_known_locator` es `security definer` y lee `lessons`/`lesson_resources`. Invocarla una
vez por columna en cada corrida del test suma trabajo a una suite que ya tarda 75 segundos. Si el
tiempo se vuelve un problema, la salida **no** es reducir la cobertura sino sembrar menos filas en
el seed: el costo está en el `exists` sobre las tablas de localizadores, no en el número de columnas.
