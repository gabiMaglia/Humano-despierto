# ADR-011 · Cómo se escribe un guard trigger — spec

**Fecha:** 2026-09-10 · **Autoridad:** ADR-011 en `engram/02_architecture.md`
**Origen:** los dos bugs que los tests atraparon en T-028, más sus precedentes.
**Nivel:** Advisory para el checklist · **Strong** para el test de alcanzabilidad.

## El problema

Hay **12 guard triggers** en el esquema. Son la tercera capa de defensa, después de RLS y de los
grants por columna, y existen para los invariantes que las otras dos no pueden expresar.

Dos modos de falla aparecieron **dos veces cada uno**. Que se repitan es el dato: no fueron
descuidos, fueron la consecuencia previsible de escribir un guard sin una lista.

### Modo A · El guard hace inalcanzable la operación legítima

Un guard `BEFORE UPDATE` que rechaza un cambio "para que nadie lo haga" también se lo rechaza **a
quien sí tiene que hacerlo**.

- **`0017_certificates_orphan`** — `on delete set null` era inalcanzable: el guard de
  inmutabilidad rechazaba todo `UPDATE`, **incluido el que dispara la FK**. Consecuencia real:
  *una cuenta con certificado emitido no se podía dar de baja.*
- **`0024_course_reviews`** — el guard exigía `is_admin()` para tocar `hidden_*`. Con
  `service_role`, `auth.uid()` es `null`, así que `is_admin()` da `false` y **la moderación quedaba
  inalcanzable**. Lo encontró un test que probaba el camino legítimo, no un ataque.

El patrón es idéntico y la lección también: **un guard que sólo se prueba con ataques da verde
mientras rompe la función.**

### Modo B · Dos actores, un rol, la misma fila

Los grants por columna separan **por rol**. RLS separa **por fila**. Cuando dos actores distintos
comparten rol (`authenticated`) y necesitan tocar columnas distintas de **la misma fila**, ninguna
de las dos capas puede distinguirlos.

- **`course_reviews`** — la autora escribe `rating`/`body`; la guía escribe `response`. Las dos son
  `authenticated`, las dos tienen políticas de RLS que alcanzan la fila, y el grant de `UPDATE`
  lista las cinco columnas porque no hay forma de partirlo por actor. Resultado: **la guía podía
  cambiar el rating que le pusieron.**
- El precedente de la misma familia es `courses`, donde `teacher_id` quedó fuera del grant de
  `UPDATE` justo para que nadie reasigne titularidad. Ahí funcionó porque el actor legítimo de esa
  columna es `service_role`, no otro `authenticated`. **La regla de columna alcanza cuando los
  actores están en roles distintos, y deja de alcanzar cuando no.**

## Decisión

1. **Un checklist de cinco preguntas**, en el ADR, que se responde al escribir cualquier guard.
2. **Un test de alcanzabilidad ejecutable**: por cada tabla con guard, afirmar que la operación
   legítima **pasa**. Convierte el modo A de "acordarse" en "el CI lo dice".

El checklist solo no bastaría: es lo que se hubiera dicho después de `0017` y el mismo bug volvió
en `0024`.

## El checklist — cinco preguntas

**1 · ¿Cuál es la operación legítima, y quién la hace?**
Antes de escribir el `raise`, escribir la frase: *"X tiene que poder hacer Y."* Si no se puede
completar, el guard no está listo. Para `certificates` era "borrar una cuenta tiene que poder
anular su certificado"; para `course_reviews`, "el admin tiene que poder ocultar".

**2 · ¿`service_role` necesita bypass?**
`is_service_context()` existe para esto. La pregunta **no** es "¿debería `service_role` poder
saltearse esto?" sino **"¿por dónde pasa la operación legítima?"**. Si el único camino posible es
un Server Action con `service_role` —porque las columnas no están en ningún grant de cliente—
entonces **sin bypass la operación no existe**.

Y el bypass **no es automático**: `diario_posts` deliberadamente no lo tiene, porque ahí el guard
protege un invariante (ADR-009) y no un permiso. La distinción es la que decide:

> **Invariante ⇒ sin bypass. Permiso ⇒ con bypass.**
>
> Un invariante es algo que no puede ser verdad *nunca*, lo escriba quien lo escriba: un
> localizador pago en texto público. Un permiso es algo que alguien sí puede hacer y otros no:
> ocultar una reseña. `service_role` no está por encima de un invariante; sí es el vehículo de un
> permiso.

**3 · ¿Hay dos actores con el mismo rol sobre esta fila?**
Listar quién escribe cada columna. Si dos filas de esa lista dicen `authenticated`, **los grants no
los separan y el guard tiene que hacerlo**, comparando `auth.uid()` contra la columna de
titularidad de la fila.

**4 · ¿El guard cubre `INSERT` y `UPDATE`?**
ADR-008 nació de que "protegido en UPDATE, abierto en INSERT" apareció tres veces en dos proyectos.
Si el invariante vale para los dos, el trigger es `before insert or update`. Si vale para uno solo,
**escribir por qué**.

**5 · ¿Qué pasa cuando el valor no cambia?**
Un `UPDATE` que reescribe el mismo valor no debería disparar nada — comparar con `is distinct from`,
no por presencia. Esto además tiene consecuencia en los tests: *un caso que escribe el valor actual
no prueba el guard*, y eso ya produjo un falso positivo al revés en T-028 (un test que reportaba
agujero donde no había).

## El test de alcanzabilidad

```
tests/guard-reachability.test.mjs
```

**Qué prueba:** por cada tabla con guard trigger, la operación legítima que ese guard **no** debe
bloquear. Un caso por tabla, escrito a mano.

**Por qué a mano y no derivado del catálogo.** Acá no hay invariante que enumerar: "cuál es la
operación legítima" es semántica del dominio, no una propiedad del esquema. La parte automática es
otra: **una meta-aserción que compara la lista de tablas con guard contra la lista de casos**, y
falla si aparece un guard nuevo sin su caso de alcanzabilidad.

```js
// La lista de guards sale del catalogo; la de casos, de este archivo. Si divergen, hay un guard
// nuevo que nadie probo por el lado legitimo — que es exactamente como 0017 y 0024 llegaron a
// produccion.
const guardsEnLaDb = await db.query(`
  select c.relname as tabla, t.tgname as trigger
    from pg_trigger t join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and not t.tgisinternal and t.tgname like '%guard%'
   order by 1, 2
`);
```

**La forma de cada caso:**

```js
test('certificates · borrar la cuenta anula el certificado, no lo bloquea', async () => {
  await db.exec(`reset role;`);
  const r = await attempt(db, `delete from auth.users where id = $1`, [ID.student]);
  assert.equal(r.ok, true, 'el guard de inmutabilidad bloquea el on-delete-set-null (bug de 0017)');
});
```

Cada caso lleva **en su nombre** la operación que protege, para que un fallo diga qué se rompió sin
abrir el archivo.

**Los casos que existen desde el día uno**, uno por cada bug ya cometido más los que se puedan
derivar del checklist:

| Tabla | Operación legítima que no puede bloquearse |
|---|---|
| `certificates` | borrar la cuenta anula el certificado (`on delete set null`) — bug de `0017` |
| `course_reviews` | `service_role` oculta una reseña — bug de `0024` |
| `courses` | `service_role` publica y despublica |
| `lessons` | `service_role` carga `video_id` + `duration_seconds` y publica (T-005 c.4b) |
| `lesson_progress` | el umbral del 90% certifica la lección |
| `diario_posts` | `service_role` publica un post |
| `campus_posts` | la moderadora hace soft delete con motivo |
| `enrollments` | el admin otorga y revoca |
| `profiles` | el hook de alta crea la fila |

## Criterios de aceptación

1. ADR-011 en `engram/02_architecture.md` con las cinco preguntas y la regla
   **invariante ⇒ sin bypass · permiso ⇒ con bypass**.
2. `tests/guard-reachability.test.mjs` con un caso por tabla de la lista.
3. **La meta-aserción existe**: un guard nuevo en la DB sin su caso de alcanzabilidad hace fallar
   el test. Verificada en rojo agregando un trigger de prueba dentro de una transacción.
4. Cada caso se verifica en rojo antes de darlo por bueno: revertir el bypass de
   `course_reviews_guard` tiene que hacer fallar su caso, y volver a poner el guard de
   inmutabilidad de `certificates` sin la corrección de `0017` tiene que hacer fallar el suyo.
5. Si algún caso falla al escribirlo, **es un bug vivo**: se arregla en este ticket, con migración.
6. `npm test` en verde.

## Lo que este ticket puede descubrir

Los nueve casos son operaciones que **hoy se asumen funcionando**. Dos de las nueve tablas ya
tuvieron este bug. Es razonable esperar que alguna más falle.

Si falla alguna, ése es el hallazgo y hay que tratarlo como tal: reproducir, arreglar con
migración, y anotar en el ADR cuál fue.

## Lo que este ticket NO hace

- **No refactoriza los 12 guards existentes.** Sólo prueba que sus caminos legítimos funcionan.
- **No agrega una función genérica de guard.** Los 12 comparten forma pero no propósito;
  unificarlos ahora acopla doce invariantes distintos a un solo archivo.
- **No toca los tests de ataque.** El test de alcanzabilidad es su complemento, no su reemplazo:
  uno prueba que lo prohibido no pasa, el otro que lo permitido sí.
