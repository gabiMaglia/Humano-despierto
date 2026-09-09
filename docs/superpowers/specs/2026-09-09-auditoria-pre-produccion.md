# Auditoría pre-producción — humano

**Fecha:** 2026-09-09 · **Rama auditada:** `fix/D-09-vulnerabilidades` (`86d8ef3`)
**Alcance:** estado del producto frente a una salida a producción real. No es una auditoría de
paridad funcional — eso vive en `2026-09-09-paridad-udemy-design.md`.

> Todo lo que este documento afirma fue medido contra el repo, con el comando citado. Donde no
> pude medir, dice **NO MEDIDO** y eso es en sí mismo el hallazgo: cuatro de los seis frentes de
> esta auditoría nunca se ejercitaron en la vida del proyecto.

## Resumen

| Sev | # | Frente |
|---|---|---|
| **Bloqueante** | 4 | Entorno (2) · Seguridad (1) · Datos (1) |
| **Alto** | 5 | Seguridad (2) · SEO (1) · Observabilidad (1) · A11y (1) |
| **Medio** | 4 | Correctitud (2) · Entorno (1) · Seguridad (1) |
| **Bajo** | 2 | Correctitud (1) · SEO (1) |

Lo que ya está fuerte y no hay que tocar: el schema. 22 migraciones, RLS + grants por columna +
guard triggers, 384 tests de mutación, harness B-1. La doctrina de seguridad de datos de este
proyecto está por encima de lo normal y **ninguno de los hallazgos de abajo la contradice**. Los
agujeros están en las capas que nunca se ejercitaron: red, entorno, cliente y operación.

---

## 1 · Entorno

### A-01 · El schema nunca corrió contra Postgres real — **BLOQUEANTE**

Las 22 migraciones y los 384 tests corren contra **PGlite**, que no ejecuta PostgREST. Toda la
superficie HTTP de Supabase está sin ejercitar: la traducción de RLS a respuestas HTTP, el
comportamiento de los grants por columna frente a un `select` parcial, los códigos de error.

La migración `0012_locator_ascii_classes` existe precisamente porque **un `CHECK` con clases POSIX
cambia de significado según el locale**. PGlite y la instancia real de Supabase no tienen por qué
coincidir en locale. El predicado que protege los localizadores pagos podría comportarse distinto
en producción y nadie lo notaría hasta que filtre.

**Acción:** provisionar el proyecto Supabase, aplicar las 22 migraciones en orden, y **re-correr
`b1-postgrest-attacks.sh` contra la instancia real**. Hasta que ese harness dé verde contra
Postgres de verdad, no hay release. Ya está decidido así en `_state.md`; acá queda con severidad.

### A-02 · Falta `YOUTUBE_API_KEY` — **BLOQUEANTE**

`lessons.duration_seconds` lo resuelve el servidor contra la YouTube Data API v3
([youtube.ts](webApp/src/lib/server/youtube.ts)). Sin la clave, `duration_seconds` queda en 0, y el
`CHECK` `lessons_published_needs_video` **impide publicar la lección**. Sin esa clave el producto
no puede cargar contenido nuevo. No es degradación: es un tope duro.

Verificar además el manejo de cuota: [youtube.ts:125](webApp/src/lib/server/youtube.ts#L125) ya
distingue `quotaExceeded`/`dailyLimitExceeded`. La cuota gratuita por defecto es de 10.000 unidades
diarias. Confirmar que el mensaje que ve la docente cuando se agota es accionable y no un error
genérico.

### A-03 · Node 20 (D-08) — **MEDIO**

`node -v` → `v20.20.2`. Node 20 está fuera de soporte. `package.json` **no declara `engines`**, así
que ni Vercel ni un colaborador nuevo tienen forma de saber contra qué runtime se probó esto.

**Acción:** subir a Node 22 LTS, declarar `engines.node` y fijar la versión en el runtime de
Vercel. Correr `npm test`, `tsc` y el build después: es cambio de runtime, no de dependencia.

---

## 2 · Seguridad

### S-01 · La premisa que justificaba el residuo de `0009` caducó — **BLOQUEANTE**

Éste es el hallazgo más importante del documento, y es de razonamiento, no de código nuevo.

`20260809130000_0009_progress_clock_cap.sql` cierra el agujero grande —declarar
`seconds_watched = duration_seconds` de una sentencia— con un tope de tasa contra el reloj del
servidor. Pero documenta, con honestidad ejemplar, un residuo **aceptado**:

> *"Un atacante que deje la pestaña realmente inactiva un tiempo largo (sin reproducir nada) y
> después declare un salto grande queda dentro del tope, porque el reloj sí pasó."*

Y el motivo por el que se aceptó:

> *"Con nulo costo de pagos/certificados en esta fase, se deja anotado para cuando haga falta, no
> se construye ahora (YAGNI)."*

**T-018 (certificados) se mergeó después** (`fec8630`, Sprint 2). Hoy existe
`/certificado/<código>`: una página **pública, sin sesión, con el nombre de una persona real**,
derivada de `completed`. La decisión de aceptar el residuo fue correcta cuando se tomó y es
incorrecta ahora — cambió el hecho, no el razonamiento. Falsificar un certificado hoy cuesta
esperar en silencio y escribir un número.

**Acción:** decisión del PO entre dos caminos, ambos legítimos:
1. **Guardar intervalos reproducidos** en vez del escalar, que es lo que la propia migración señala
   como la solución correcta y lo que hace el rubro. Cierra el residuo de raíz. Migración + cambio
   en el player.
2. **Aceptarlo explícitamente para certificados**, y decirlo *en la página del certificado*: que
   acredita seguimiento del curso, no evaluación. Costo cero, honestidad intacta.

Lo que no es opción es dejarlo como está: hoy el documento dice que el residuo no tiene costo, y
tiene uno.

### S-02 · Cero rate limiting en las 7 Server Actions — **ALTO**

`grep -rniE "ratelimit|rate-limit|captcha|turnstile" src/` no devuelve nada fuera del throttle de
UI. [actions.ts:57](webApp/src/app/leccion/[id]/actions.ts#L57) lo dice literalmente: *"este action
no throttlea nada, sólo escribe lo que le llega"*. El throttle de 5s vive en `LessonPlayer` — lado
cliente, o sea inexistente como control.

El daño por acción está acotado por el schema (`0009` topea el progreso, RLS topea el resto), así
que **esto no es escalada de privilegios**: es costo y disponibilidad. Los blancos concretos:

- `saveLessonProgress` — escritura sin costo por parte del atacante, en bucle.
- El registro — sin fricción anti-bot, y **dispara un mail de bienvenida** (T-020). Un bot puede
  usar la plataforma como amplificador de correo hacia terceros. T-020 ya peleó exactamente ese
  bug ("bombardeo de bienvenidas a terceros"); el arreglo fue de lógica, no de tasa.
- Login — sin límite de intentos.

**Acción:** límite por IP y por usuario en las acciones de escritura, con el registro como
prioridad uno. Mínimo viable: contador en Postgres con ventana deslizante, que no suma
infraestructura. Si Vercel es el destino final, su rate limiting en el edge es más barato.

### S-03 · D-06 — OpenAPI publica los nombres de columnas — **ALTO**

PostgREST sirve su esquema OpenAPI en la raíz. Revela nombres de tablas y columnas, incluidas las
que sólo tienen grant a `service_role` (`video_id`, `drive_file_id`). No filtra **valores** —los
grants aguantan— pero le entrega a un atacante el mapa exacto de qué pedir.

**Acción:** `db-schema` fuera de la config de PostgREST, o `ANON_KEY` sin acceso al endpoint raíz.
Verificar después contra la instancia real, no contra PGlite (que no lo sirve, ver A-01).

### S-04 · Sin cabeceras de seguridad — **MEDIO**

`next.config` no define CSP, `X-Frame-Options`, `Referrer-Policy` ni `Permission-Policy`. El player
embebe YouTube, así que la CSP necesita `frame-src` para `youtube-nocookie.com` y trabajo real —
no es una línea. Pero hoy no hay ninguna, y `/certificado/<código>` es una página pública
embebible por cualquiera.

---

## 3 · Datos y operación

### D-01 · Backup y restore nunca probados — **BLOQUEANTE**

No hay evidencia en el repo de una prueba de restauración. Un backup que nunca se restauró no es
un backup. Con certificados emitidos —documentos que la plataforma promete honrar aunque el curso
se despublique (T-018 c.6)— la pérdida de datos no es recuperable pidiendo disculpas.

**Acción:** antes del release, un ciclo completo dump → restore en una instancia limpia,
verificando que `schema_migrations` y las 22 migraciones queden consistentes. Documentar el RPO/RTO
que el plan de Supabase elegido realmente da.

---

## 4 · Correctitud web

### C-01 · `notFound()` devuelve 200 en `/panel/docente/cursos/[courseId]` — **MEDIO**

Ya diagnosticado y resuelto donde importaba (`1c52c4a`): no es del modo dev, es que `loading.tsx`
abre un Suspense y la respuesta ya salió con 200. Queda a propósito en esa ruta porque ahí el
esqueleto animado vale más y un curso ajeno responde igual que uno inexistente — sin enumeración
posible.

**Sigue siendo hallazgo por una razón distinta a la que se descartó:** un 200 en un 404 le miente a
Googlebot y genera soft-404 en el índice. En una ruta bajo `[auth]` no indexable el daño es nulo.
**Confirmar que `/panel/*` está fuera del índice** (ver E-01, que hoy no existe) y entonces sí,
cerrarlo como aceptado con fundamento.

### C-02 · Links muertos — **MEDIO** · *subestimado en el primer barrido*

**CORREGIDO AL EJECUTAR (2026-09-09).** No era uno, eran **cuatro** `href="#"`, y el peor no era el
del checkout sino el **footer**: sus diez etiquetas de navegación —presentes en todas las páginas—
eran decorativas. Cuatro de esos destinos existían (`/cursos`, `/guias`, `/diario`, `/circulo`) y
seis no.

Arreglado: destino real a los cuatro que existen, fuera los demás, y `check-seo.sh` verifica que no
reaparezcan. Queda **anotado y sin tocar** el campo "Código de invitación" con su botón "Aplicar"
sin handler en el checkout: es un stub de T-026 (cobros) y sacarlo excede una auditoría.

### C-03 · 21 `console.*` en `src/` — **BAJO**

Ver O-01.

---

## 5 · Accesibilidad — **NO MEDIDO**

### X-01 · Nunca se ejecutó una auditoría de a11y — **ALTO**

Medición directa de los dos componentes con más interacción:

```
CurriculumAccordion.tsx : 2 ocurrencias de aria-/role=/onKeyDown/tabIndex
LessonPlayer.tsx        : 1
```

**CORREGIDO AL EJECUTAR (2026-09-09).** El conteo bruto de atributos llevó a una conclusión
equivocada sobre el acordeón: **ya era un `<button>` con `aria-expanded`** y sí era operable por
teclado. Contar atributos mide densidad, no corrección — la inferencia estaba mal, no la medición.

Lo que sí estaba roto es distinto y es propio de §4: **los glifos de estado eran mudos**
(`✓ ▶ ○ ✦ ⌗` sin texto alternativo), y el `<iframe>` de YouTube —el contenido principal de la
pantalla— **no tenía `title`**, porque lo crea la IFrame API y no el JSX. Las tabs del player sí
carecían por completo del patrón ARIA. Todo eso está arreglado y verificado sobre HTML servido.

Agravante propio de este proyecto: §4 prohíbe raster, así que **la información se transmite con
glifos Unicode** (`☉ ☽ ✦ ◐ ◑`). Un `✦` suelto sin `aria-label` es ruido para un lector de pantalla,
y acá los glifos cargan significado (estado de lección, fase lunar). Un `☽` decorativo necesita
`aria-hidden`; uno informativo, texto alternativo. Hoy no hay ninguno de los dos.

**Acción:** pasada de axe sobre las 22 rutas, y recorrido manual sólo con teclado por el flujo
crítico: entrar → catálogo → ficha → inscribirse → aula. Tratar el acordeón y el player como dos
tickets propios; el resto probablemente sea barato.

---

## 6 · SEO — **NO MEDIDO**

### E-01 · Sin `sitemap.ts`, sin `robots.ts`, y 2 de 22 páginas con metadata — **ALTO**

```
find src -name "sitemap*" -o -name "robots*"  → vacío
export const metadata | generateMetadata      → 2 archivos de 22 pages
```

20 páginas comparten el `<title>` del layout raíz. Para un catálogo de cursos —producto cuya
adquisición es orgánica— esto es la diferencia entre existir y no existir en búsqueda. Y sin
`robots.ts`, `/panel/*` y `/leccion/*` no están excluidas del índice por nada más que su necesidad
de sesión, que un crawler igual intenta.

**Acción:** `generateMetadata` en las rutas públicas (`/`, `/cursos`, `/cursos/[slug]`, `/diario`,
`/diario/[slug]`, `/guias`, `/guias/[slug]`), `sitemap.ts` alimentado por los cursos y posts
publicados, y `robots.ts` que excluya `/panel`, `/leccion`, `/circulo` e `/inscribirme`.

### E-02 · Open Graph sin imagen, y §4 lo agrava — **BAJO**

Un link compartido en WhatsApp o Instagram —los canales naturales de este público— se ve como
texto plano. La salida sin violar §4 es `opengraph-image.tsx` de Next, que **genera la imagen en el
servidor a partir de JSX**: tipografía, glifo y numeral romano del curso, sin subir un solo raster.
El resultado es un PNG, pero no hay pipeline de imágenes ni almacenamiento, y la fuente sigue
siendo código. Encaja con §4 en espíritu; conviene que el PO lo confirme explícitamente.

---

## 7 · Observabilidad — **NO MEDIDO**

### O-01 · Sin captura de errores, sin logs estructurados — **ALTO**

```
grep -rniE "sentry|pino|winston|opentelemetry" package.json src/  → vacío
21 console.*
```

Hay 9 `error.tsx`, o sea que los errores se **muestran** bien. No se **registran** en ningún lado.
En producción, un fallo en una Server Action se convierte en un `console.error` dentro de una
función serverless que nadie lee. No hay forma de saber si algo está roto salvo que alguien avise.

Lo único auditable que existe hoy es `mail_log` —con estado explícito, tope de intentos y fencing,
producto de las 8 rondas de T-020—. Es la prueba de que el proyecto **sabe** hacer esto bien; sólo
que se hizo para un subsistema y no para el resto.

**Acción:** captura de errores en servidor y cliente (Sentry o el equivalente que el PO prefiera),
y reemplazar los `console.*` de las rutas de servidor por un logger con nivel y contexto. Mínimo
irreducible para el release: **saber que algo falló sin que te lo cuente una alumna.**

---

## Puerta de release

No sale a producción hasta que:

1. **A-01** — las 22 migraciones aplicadas contra Supabase real y `b1-postgrest-attacks.sh` en
   verde contra esa instancia.
2. **A-02** — `YOUTUBE_API_KEY` provista y verificada con una lección real de punta a punta.
3. **S-01** — el PO decide entre intervalos o aceptación explícita, y se ejecuta la decisión.
4. **D-01** — un restore probado.

**Nota sobre el barrido ADR-004.** Sin `COOKIE`, `check-adr004.sh` deja tres rutas sin escanear
(`/circulo`, `/panel`, `/inscribirme/*`, todas 307) y **las cuenta como violaciones** — se niega,
correctamente, a declarar limpio lo que no pudo mirar. Verde de verdad exige correrlo con sesión:

```bash
COOKIE="sb-<ref>-auth-token=base64-<sesión>" bash webApp/scripts/check-adr004.sh <url>
```

Verificado así el 2026-09-09 con el fixture `alumna@test.local`: **12/12 rutas ✓, ADR-004 OK**.

Alto y medio no bloquean, pero **E-01 y O-01 conviene resolverlos antes del release y no después**:
el SEO tarda semanas en surtir efecto —arrancar sin él regala el primer mes— y la observabilidad
sirve justo cuando más se la necesita, que es el día uno.
