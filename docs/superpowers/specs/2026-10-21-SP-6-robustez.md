# SP-6 · Robustez

**Fecha:** 2026-10-21 · **Padre:** `2026-10-21-cierre-funcional-master.md` (D4, R-1..R-14, timestamp `20261022150000`) · **Depende de:** todo lo anterior (SP-0..SP-5)
**Tickets, en este orden:** T-050 rate limiting · T-051 errores y logs · T-052 CSP + OG + `not-found` · T-053 landing sin mocks · T-054 transporte Resend (ADR-014)

Este spec no re-litiga el master. Diagnóstico previo: auditoría pre-producción S-02 (rate limiting), S-04 (cabeceras), O-01 (errores y logs), E-02 (Open Graph). Acá va la solución.

## Estado medido (2026-10-21, rama `fix/auditoria-seo-a11y`)
- 8 archivos `actions.ts` bajo `src/app` (el master dice 9; T-043, T-030 y T-031 suman los suyos antes de SP-6). Ninguno limita tasa: `grep -riE "ratelimit|limiter|upstash" src` vacío. `leccion/[id]/actions.ts` lo declara: "este action no throttlea nada".
- 22 `console.*` en `src`: 15 en `lib/server/mail` (14 en `notify.ts`, 1 en `send.ts`), 1 en `site-url.ts`, 1 en `reviews.ts`, 1 en `leccion/[id]/actions.ts`, 4 del lado cliente (`LessonPlayer.tsx` y 3 `error.tsx`). Sin Sentry, sin logger.
- `next.config.ts`: 4 cabeceras (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`); CSP pospuesta a propósito. `src/proxy.ts` existe (Next 16) con matcher solo en `/panel` e `/inscribirme`.
- No hay `global-error.tsx`, `not-found.tsx` ni `opengraph-image.tsx` en la raíz de `app` (sí hay 9 `error.tsx` anidados y un `not-found.tsx` en `certificado/[code]`). `layout.tsx` ya tiene `metadataBase` desde `getSiteUrl()`.
- `useYouTubePlayer.ts` carga `https://www.youtube.com/iframe_api` sin opción `host`: el iframe sale de `www.youtube.com`, no de `youtube-nocookie.com`.
- `src/lib/mocks/landing.ts` es el único mock que queda; lo consumen `HeroSection`, `DisciplinesBar`, `LunarCalendar`, `TestimonialsSection`.
- `public/` tiene los 5 svg del template de create-next-app (`file`, `globe`, `next`, `vercel`, `window`), ninguno referenciado.
- Transporte de mail: `SmtpTransport` casero sobre `node:net`, sin AUTH ni STARTTLS, un deadline para todo el diálogo (5 s) y tope duro de 15 s en `send.ts`. La interfaz `MailTransport { send(message): Promise<void> }` es la que hay que conservar.

---

## T-050 · Rate limiting en Server Actions

**Agente:** `nerv-backend` + `nerv-arquitecto` · **Nivel:** Strong (toca permisos y migración; plan en `engram/plans/T-050.md`) · **Depende de:** T-039 (Vitest), T-043/T-030/T-031 (sus actions existen)

### Por qué
S-02: toda escritura es gratis para quien la dispara. El daño no es escalada (RLS y `0009` topean) sino costo, disponibilidad y amplificación de mail. El throttle de 5 s del player es del lado cliente, o sea inexistente como control.

### Backend elegido y justificación
**Postgres** (tabla `rate_limit_buckets` + función), con **memoria por proceso** como fallback declarado insuficiente. Tres líneas: por D4 el proyecto no va a Vercel, así que un solo proceso Node es plausible y la memoria funcionaría hoy; pero Postgres es el único estado compartido que seguro existe en todo despliegue futuro (Supabase cloud sí entra), y un límite que se resetea con cada reinicio del proceso o se multiplica por instancia no es un límite. La memoria queda para Vitest y para `RATE_LIMIT_BACKEND=memory` explícito, nunca por defecto.

### Migración `20261022150000_0026_rate_limit.sql`
- `rate_limit_buckets (key text, window_start timestamptz, count int not null default 0, primary key (key, window_start))`. Ventana fija por bucket (no deslizante: más simple, el error máximo es 2x en el borde y se compensa con límites conservadores).
- `check_rate_limit(p_key text, p_max int, p_window_seconds int) returns table (allowed boolean, remaining int, retry_after_seconds int)`: una sola sentencia `insert ... on conflict do update set count = count + 1 returning`, con `window_start = to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds)`. `allowed = count <= p_max`. Al final borra las filas de esa `key` con `window_start < now() - 2 * p_window_seconds` (limpieza oportunista, sin cron).
- `security definer`, `set search_path = ''`, `revoke execute ... from public`, `grant execute ... to service_role` únicamente. Tabla con RLS habilitada sin policies y `revoke all from anon, authenticated` (R-1, mismo cierre que `mail_log` en `0019`).
- Grants de `0003` no se tocan: ningún cliente ve esta tabla.

### Qué se toca
- `src/lib/server/rate-limit.ts` (`import 'server-only'`): `limit(key, { max, windowSeconds }): Promise<void>` que lanza `RateLimitError { retryAfterSeconds }`; `RateLimiter` interfaz con dos implementaciones, `PostgresRateLimiter` (rpc `check_rate_limit` vía `getAdminSupabaseClient`) y `MemoryRateLimiter` (Map, misma semántica de ventana fija). Fallo de la base al consultar el límite: **se deja pasar y se loguea** (fail-open); un rate limiter caído no puede tumbar la app.
- `rateLimitKey(action, user | ip)`: `${action}:u:${userId}` con sesión; sin sesión `${action}:ip:${ip}` con `ip` de `x-forwarded-for` (primer valor) o `x-real-ip`, y `ip:unknown` si no hay ninguno (en local sin proxy caen todos en el mismo bucket; se documenta en el helper).
- Cada action llama `limit` **antes** de validar y de tocar la base. Las actions que devuelven objeto de resultado mapean `RateLimitError` a `{ ok: false, code: 'rate_limited', message }`; las que lanzan, relanzan con el mismo mensaje humano: "Demasiados intentos. Esperá N segundos y volvé a probar." Un Route Handler (si T-044 o T-047 dejaron alguno) responde `429` con `Retry-After`.
- Límites por acción, por usuario salvo que se indique IP (ventana en segundos):

| Acción | max / ventana |
|---|---|
| Registro, login, reset, OAuth | **No se toca:** GoTrue ya limita por IP (`config.toml [auth.rate_limit]`: `sign_in_sign_ups = 30` por 5 min, `email_sent = 2` por hora, `token_verifications = 30`). Se documenta en el helper y en `.env.example`. Con D8 (`enable_confirmations = true`), `email_sent = 2` es el techo real de altas por hora en local: subirlo es decisión del PO, no de este ticket. |
| `sendWelcomeEmailAction` | 3 / 3600 (además del tope de 3 para siempre que ya impone `mail_log`) |
| `saveReviewAction` · `respondReviewAction` | 5 / 600 · 10 / 600 |
| `createCampusPostAction` · `updateCampusPostAction` | 10 / 600 · 30 / 600 |
| Q&A (T-030): pregunta · respuesta | 10 / 600 · 20 / 600 |
| Anuncios (T-031) | 5 / 3600 |
| Solicitud de inscripción (T-043) | 5 / 3600 |
| `saveLessonProgress` · `saveLessonNote` | 30 / 60 · 20 / 60 (el cliente manda cada 5 s = 12/min; hay margen) |
| Actions de docente/admin (curso, módulo, lección, recurso, diario, rol, inscripción) | 60 / 60 por usuario (anti-bucle, no anti-persona) |
| `sendMail` (choke point, clave `mail:global`) | 200 / 3600 global, y 20 / 3600 por `mail:to:<email>` |
| `reportClientErrorAction` (T-051) | 10 / 60 por IP |

### Criterios (Gherkin)
1. **Dado** un usuario que llama `saveReviewAction` 6 veces en 10 minutos, **cuando** llega la sexta, **entonces** recibe `{ ok: false, code: 'rate_limited' }` con mensaje humano, no se escribe nada y `rate_limit_buckets` tiene `count = 6` para su clave.
2. **Dado** dos usuarios distintos, **cuando** cada uno hace 5 reseñas, **entonces** ninguno es limitado (claves separadas).
3. **Dado** una ventana vencida, **cuando** el mismo usuario vuelve a llamar, **entonces** pasa y la fila vieja de su clave desaparece.
4. **Dado** `check_rate_limit` invocada como `anon` o `authenticated` vía PostgREST, **entonces** 42501 (R-6: ataque en `b1-postgrest-attacks.sh`).
5. **Dado** la base inaccesible al consultar el límite, **cuando** se llama una action, **entonces** la action sigue y queda un `log.error` con `rate_limit_backend_down`.
6. **Dado** `sendMail` con 200 envíos en la hora, **cuando** llega el 201, **entonces** devuelve `{ ok: false, error: 'rate_limited' }` sin tocar el transporte (R-12: el mail nunca rompe la operación).
7. **Dado** el registro o login, **entonces** no hay límite de aplicación duplicado; el de GoTrue está documentado con sus valores.

### Cómo se verifica
Vitest: `rate-limit.test.ts` sobre `MemoryRateLimiter` (ventana, reset, claves, fail-open con un `RateLimiter` que lanza). PGlite: `supabase/tests/rate-limit.test.mjs` sobre `check_rate_limit` (conteo, borde de ventana con `clock_timestamp` simulado por `p_window_seconds = 1` y espera real, limpieza, 42501 para roles cliente). Playwright de T-039: el flujo de reseña repetido 6 veces muestra el mensaje humano. Gate: los 6 verificadores del master.

### Riesgo
La ventana fija deja pasar hasta 2x en el borde; aceptado y compensado con límites bajos. `ip:unknown` en local agrupa a todos: solo afecta `reportClientErrorAction`, el único límite por IP. El fail-open es deliberado: se elige disponibilidad sobre control cuando el control mismo falla, y queda registrado.

---

## T-051 · Captura de errores y logs estructurados

**Agente:** `nerv-backend` · **Nivel:** Advisory · **Depende de:** T-039, T-050 (límite del action de reporte)

### Por qué
O-01: hay 9 `error.tsx` que muestran bien y nada que registre. Un fallo en una Server Action es un `console.error` que nadie lee. Mínimo irreducible: saber que algo falló sin que lo cuente una alumna.

### Decisión sobre Sentry
**Sin Sentry en este bloque, con el enganche listo.** El punto de enganche es el que el propio `@sentry/nextjs` usa (verificado en Context7): `instrumentation.ts` con `register()` y `onRequestError`, más `global-error.tsx`. Hoy esas tres piezas llaman al logger propio; el día que el PO quiera Sentry, `onRequestError = Sentry.captureRequestError` y `Sentry.captureException(error)` en `global-error.tsx` son el cambio entero. No se agrega la dependencia ni una variable `SENTRY_DSN` vacía que no hace nada.

### Qué se toca
- `src/lib/server/log.ts` (`import 'server-only'`): `log.info|warn|error(event: string, fields?: Record<string, unknown>)` que escribe **una línea JSON por evento** a `stdout` (`info`) o `stderr` (`warn`, `error`): `{ ts, level, event, request_id, ...fields }`. `event` es snake_case estable (`mail_send_failed`, `rate_limit_backend_down`), no una frase. Errores se serializan como `{ name, message, stack }` bajo `err`. `request_id` sale de `headers().get('x-request-id')` cuando hay request (en `try`, porque fuera de request lanza) y es `null` si no.
- `src/proxy.ts`: genera `x-request-id` (`crypto.randomUUID()`) y lo propaga en request y response; el matcher se amplía a todo salvo `_next/static`, `_next/image` y `favicon.ico` (T-052 reusa el mismo matcher para la CSP). `updateSession` sigue corriendo **solo** para los prefijos protegidos: ampliar el matcher no agrega una consulta por request.
- `src/instrumentation.ts`: `register()` valida env obligatoria (T-054 agrega la suya) y `onRequestError` loguea `{ event: 'request_error', digest, path, routerKind, routeType }`.
- Reemplazo de los 18 `console.*` de servidor por `log.*` con evento y campos (los 14 de `notify.ts` conservan su texto como `message`, no se pierde contexto de T-020). `site-url.ts` pasa a `log.warn('site_url_missing')` una sola vez por proceso.
- Lado cliente: `src/app/actions/report-error.ts` con `reportClientErrorAction({ digest, message, path })` (límite 10/min por IP, T-050; sin stack, sin PII; `message` truncado a 500). Los 9 `error.tsx` lo llaman en un `useEffect` y muestran el `digest` en pantalla como "código de referencia" (es lo que un soporte humano puede buscar en el log). `LessonPlayer.tsx` pierde su `console.*`.
- `src/app/global-error.tsx` (`'use client'`, con `<html>` y `<body>` propios, lenguaje Cosmos, botón de reintento, `digest` visible) que también reporta vía la action.
- ESLint: `no-console: error` para `src/**`, con `log.ts` como única excepción.

### Criterios (Gherkin)
1. **Dado** `sendMail` contra un SMTP caído, **entonces** `stderr` recibe una línea JSON con `level: 'error'`, `event: 'mail_send_failed'`, `request_id` del request y `err.message`.
2. **Dado** `grep -rnE "console\." webApp/src`, **entonces** solo aparece `src/lib/server/log.ts`.
3. **Dado** una Server Component que lanza, **cuando** Next invoca `onRequestError`, **entonces** queda `request_error` con el mismo `digest` que ve el usuario en `error.tsx`.
4. **Dado** un `error.tsx` renderizado, **entonces** muestra el `digest` y llama a `reportClientErrorAction` una vez por error (no por render).
5. **Dado** 11 reportes de error desde la misma IP en un minuto, **entonces** el 11 es descartado sin log de error (ruido, no incidente).
6. **Dado** `npm run lint`, **entonces** un `console.log` nuevo en `src/app` falla.

### Cómo se verifica
Vitest: `log.test.ts` (forma de la línea, serialización de `Error`, `request_id` nulo fuera de request). Vitest de `send.ts` con transporte que lanza: la línea de log existe. Playwright: forzar un error en una ruta de prueba y ver el `digest`. `npx tsc --noEmit && npm run lint`.

### Riesgo
`instrumentation.ts` corre en `nodejs` y `edge`; el logger usa `process.stdout`, así que `register()` debe guardar `NEXT_RUNTIME === 'nodejs'` (proxy corre en Node por defecto en Next 16, pero se verifica en el plan). Sin Sentry no hay agregación ni alerta: los logs son líneas en el `stdout` del proceso; quien despliegue decide dónde van. Eso está declarado en el master como suficiente para este bloque.

---

## T-052 · CSP, Open Graph y páginas de error

**Agente:** `nerv-web` + `nerv-devops` · **Nivel:** Strong (cabeceras; plan en `engram/plans/T-052.md`) · **Depende de:** T-051 (proxy ampliado), T-047 (portada), T-042 (avatar en Storage)

### Por qué
S-04: sin CSP. E-02: un link compartido en WhatsApp se ve como texto plano. Y `/no-existe` cae en la 404 genérica de Next, sin el lenguaje del sitio. Las tres cosas tocan la raíz de `app` y las cabeceras, así que van juntas.

### CSP, según la guía actual de Next 16 (Context7: `content-security-policy.mdx`)
- Nonce por request en `src/proxy.ts`: `Buffer.from(crypto.randomUUID()).toString('base64')`, puesto en `x-nonce` y dentro de la cabecera, en request y response. Next aplica el nonce solo a sus scripts y estilos; exige render dinámico en toda página con nonce (ya lo son: todas leen sesión o base).
- Política inicial, en **`Content-Security-Policy-Report-Only`**:
  `default-src 'self'; script-src 'self' 'nonce-…' 'strict-dynamic' https://www.youtube.com [+ 'unsafe-eval' solo en dev]; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://i.ytimg.com <SUPABASE_URL>; font-src 'self'; connect-src 'self' <SUPABASE_URL>; frame-src https://www.youtube.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; upgrade-insecure-requests [solo producción]`.
  `<SUPABASE_URL>` es el origen de `NEXT_PUBLIC_SUPABASE_URL` (Storage y auth comparten host). `frame-src` es `www.youtube.com` porque es lo que el player usa hoy; cambiar a `youtube-nocookie.com` requiere pasar `host` al `YT.Player` y es decisión aparte (privacidad), no de este ticket. `frame-ancestors 'self'` reemplaza a `X-Frame-Options` como fuente de verdad; la cabecera vieja se conserva por navegadores antiguos.
- `style-src 'unsafe-inline'` es **deliberado y declarado**: la landing y el player usan `style={{}}` inline por todos lados (gradientes, animaciones) y un nonce no cubre atributos `style`. Quitarlo es trabajo del reskin, no de acá. `script-src` sí es estricto: ahí está el riesgo real.
- `report-to`/`report-uri`: `POST /api/csp-report` (Route Handler, `429`-capaz vía T-050, 20/min por IP) que loguea `csp_violation` con `blocked-uri`, `violated-directive`, `document-uri`. Sin endpoint no hay forma de saber qué rompe el modo enforce.
- **Criterio de pasar a enforce** (cambio de una constante, `CSP_ENFORCE=true` en env): `check-seo.sh` y los flujos Playwright de T-039 corridos con la política en Report-Only no producen ninguna línea `csp_violation`, y una sesión manual del player (reproducir, buscar, completar) tampoco. Se registra en `05_handoff_log.md` con la fecha y el commit. En enforce la cabecera cambia de nombre, nada más.

### Open Graph
- `src/app/opengraph-image.tsx` (1200x630, `ImageResponse` de `next/og`): fondo `#0a0418`, título en Cinzel, glifo `✦`, numeral romano decorativo. Cinzel se carga con `fonts:` desde un `.ttf` OFL vendoreado en `src/assets/fonts/` leído con `readFile`, nunca fetch a Google en request (D4: todo local). `alt`, `size`, `contentType` exportados.
- `src/app/(marketing)/cursos/[slug]/opengraph-image.tsx`: si el curso tiene portada (columna de T-047, bucket `uploads`, `covers/<course_id>/`), la lee con `service_role` como `ArrayBuffer` y la compone con título y guía encima; si no, SVG generativo con la disciplina, el título y el numeral del curso. Curso inexistente o no publicado: 404, no una imagen vacía.
- `generateMetadata` existente ya declara `openGraph.url`; Next agrega `og:image` solo. Se verifica con `curl` que `/opengraph-image` responde `image/png`.

### Páginas de error y limpieza
- `src/app/not-found.tsx` raíz con el lenguaje visual actual (R-13: componentes y tokens que hay), `Starfield`, eyebrow `✧ Este camino no existe`, links a `/cursos` y `/`. Responde **404 real**: sin `loading.tsx` en la raíz la respuesta no sale antes (lección C-01). `noindex` (R-11).
- Borrar `public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` tras confirmar `grep -rn "\.svg" src` no los referencia.

### Criterios (Gherkin)
1. **Dado** cualquier ruta HTML, **entonces** la respuesta trae `Content-Security-Policy-Report-Only` con un `nonce` distinto por request y los `<script>` de Next llevan ese `nonce`.
2. **Dado** el player en `/leccion/[id]` con la CSP en Report-Only, **cuando** se reproduce un video, **entonces** `/api/csp-report` no recibe ninguna violación.
3. **Dado** `CSP_ENFORCE=true`, **entonces** la cabecera se llama `Content-Security-Policy` y un `<script>` inline sin nonce inyectado en una página de prueba no ejecuta.
4. **Dado** `GET /opengraph-image`, **entonces** `200`, `image/png`, 1200x630. **Dado** `GET /cursos/<slug-publicado>/opengraph-image`, **entonces** idem con el título del curso; **dado** un slug inexistente, **entonces** `404`.
5. **Dado** `GET /ruta-que-no-existe`, **entonces** `404` con la página propia y `<meta name="robots" content="noindex">`.
6. **Dado** `ls webApp/public`, **entonces** solo quedan archivos referenciados por el código.
7. **Dado** `/certificado/<código>` embebido desde otro origen, **entonces** el navegador lo bloquea (`frame-ancestors 'self'`).

### Cómo se verifica
`check-seo.sh` extendido: cabecera CSP presente, `og:image` en las 9 públicas, `404` real en una ruta inexistente. Playwright: página de prueba con script inline sin nonce en enforce. Harness `b1-postgrest-attacks.sh` no cambia. Gate completo del master.

### Riesgo
`'strict-dynamic'` hace que el `iframe_api` inyectado por `useYouTubePlayer` (creado por un script con nonce) sea permitido; si un navegador viejo lo ignora, `https://www.youtube.com` en `script-src` lo cubre. El Report-Only puede quedar meses sin pasar a enforce si nadie mira el log: por eso el criterio de paso es mecánico y queda anotado en el handoff, no "cuando parezca estable".

---

## T-053 · Landing sin mocks

**Agente:** `nerv-web` · **Nivel:** Advisory · **Depende de:** T-037 (reseñas moderadas), T-043 (inscripciones reales), T-039

### Por qué
La landing vende con números inventados (`12 guías`, `48 cursos`, `2k iniciadas`) y testimonios marcados como "ilustrativos". T-019 c.2: un número inventado es peor que ninguno. Después de esto `src/lib/mocks/` queda vacío y se borra.

### Decisiones
- **Hero:** stats derivadas en `src/lib/server/landing.ts` (una consulta con `service_role`, cacheada con `unstable_cache` o el `cache` de React por 10 min): cursos publicados, docentes con al menos un curso publicado, inscriptas activas distintas. **Cada stat en 0 se omite; si las tres son 0, se omite la fila entera.** Números exactos, sin "2k". La copy del Hero (badge, h1, sub, CTAs) no es dato: pasa a constantes dentro de `HeroSection.tsx`.
- **DisciplinesBar:** `select distinct discipline from courses where status = 'published'`, ordenadas por cantidad de cursos. Icono por disciplina con un mapa local (`Astrología`, `Tarot`, `Reiki`, `Herbalismo` mantienen el SVG actual; cualquier otra usa un glifo `✧`). El subtítulo es `N cursos`, no la copy inventada. Cada tarjeta linkea a `/cursos?disciplina=<x>` si el catálogo ya filtra; si no, a `/cursos`. Sin cursos publicados, la barra no se renderiza.
- **Testimonials:** **sin migración**, `course_reviews` tal cual: las 3 más recientes con `rating = 5`, `body not null`, `hidden_at is null`, curso publicado; nombre de `profiles.full_name`, rol = título del curso. Menos de 3: se muestran las que hay; 0: la sección se omite. Desaparece el rótulo "testimonios ilustrativos". `is_featured` queda como mejora futura si la dueña quiere elegir a mano (migración propia, no acá).
- **LunarCalendar:** **se calcula**, no se quita. Fase lunar es aritmética pura: edad = `(now - época de luna nueva de referencia) mod 29.530588853 días`, sin API ni dependencia. `src/lib/lunar.ts` (puro, sin `server-only`, testeable) devuelve para hoy y los próximos 7 saltos de ~3.7 días la fase (`new | crescent | half | gibbous | full`, creciente o menguante) y la fecha. Las etiquetas (`sembrar`, `liberar`...) son copy por fase, en el componente. "Hoy" es el primer elemento. El test fija dos fechas de luna nueva y llena tomadas de una efeméride publicada al momento de implementar, citada en el test; tolerancia 1 día.
- Las cuatro secciones pasan a Server Components que reciben datos por props desde `page.tsx` (R-10). `page.tsx` queda dinámica o con `revalidate = 600`.

### Criterios (Gherkin)
1. **Dado** la base con 3 cursos publicados de 2 docentes y 5 inscriptas activas, **entonces** el Hero muestra `3 · 2 · 5` con sus rótulos; **dado** 0 inscriptas, **entonces** esa stat no aparece.
2. **Dado** cursos publicados en `Tarot` y `Astrología` solamente, **entonces** la barra muestra esas dos con `N cursos` cada una.
3. **Dado** 2 reseñas de 5 estrellas con texto y 1 oculta por admin, **entonces** se ven 2 testimonios reales y ninguno oculto; **dado** 0, **entonces** no hay sección ni encabezado huérfano.
4. **Dado** una fecha de luna llena conocida, **cuando** `lunarPhase(fecha)`, **entonces** `full` con tolerancia de 1 día.
5. **Dado** `ls webApp/src/lib/mocks`, **entonces** el directorio no existe y `grep -rn "lib/mocks" src` está vacío.
6. **Dado** `check-seo.sh`, **entonces** `/` sigue con su `<title>` y pasa como antes.

### Cómo se verifica
Vitest: `lunar.test.ts`, `landing.test.ts` (omisión de ceros con un cliente falso). PGlite: nada nuevo, solo lecturas. Playwright: la landing renderiza con el seed de T-038 y muestra números iguales a `select count(*)`. Gate del master.

### Riesgo
La landing pasa de estática a dinámica; el caché de 10 minutos lo absorbe. Con base vacía la página queda más corta (sin stats, sin barra, sin testimonios): es correcto y es lo que T-019 pide. El cálculo lunar sin corrección de longitud tiene error de horas, irrelevante para un calendario decorativo con fechas por día.

---

## T-054 · Transporte de mail con adaptador Resend

**Agente:** `nerv-backend` + `nerv-arquitecto` · **Nivel:** Adversarial (ADR-014; plan en `engram/plans/T-054.md`, verificador ciego) · **Depende de:** T-051 (`instrumentation.ts`, logger), T-050 (límite global de `sendMail`)

### Por qué
D4: Resend en producción, Mailpit en local. `transport.ts` ya lo anticipa ("nodemailer u otro cliente HTTP de un ESP entran acá el día que exista ese ADR"). Ese ADR es este.

### ADR-014 (se escribe en `engram/02_architecture.md`, numerado tras ADR-013)
"Transporte de mail elegido por env: `MAIL_TRANSPORT=smtp|resend`. SMTP (el diálogo casero de T-020, sin AUTH ni STARTTLS) **solo** para Mailpit local; nunca contra un MTA real. Resend vía su API HTTP en producción. La interfaz `MailTransport` es el contrato; `send.ts` sigue siendo el único choke point y conserva el tope duro de 15 s. `MAIL_FROM_ADDRESS` debe pertenecer a un dominio verificado en Resend (SPF + DKIM): esa verificación es trabajo de DNS fuera de este bloque y queda anotada acá como prerrequisito del primer envío real." Registra también qué se descarta: nodemailer (dependencia grande para un `fetch`), el SDK oficial `resend` (la API es un `POST`; el SDK agrega superficie sin agregar garantías de timeout).

### Qué se toca
- `src/lib/server/mail/transport-resend.ts`: `ResendTransport implements MailTransport` con `{ apiKey, baseUrl = 'https://api.resend.com', timeoutMs = 5000 }`. Verificado en Context7 (`/llmstxt/resend_llms_txt`): `POST {baseUrl}/emails`, `Authorization: Bearer <key>`, `Content-Type: application/json`, body `{ from: "Nombre <email>", to: [email], subject, html, text }`, éxito `200 { id }`, error `4xx/5xx { statusCode, message, name }`. `from` y `to` se arman con `formatAddress` de `@/lib/mail/address.mjs` (misma función que SMTP: la gramática RFC 5322 no se duplica). `fetch` con `AbortSignal.timeout(timeoutMs)`: un servidor que acepta y no contesta rechaza a los `timeoutMs` (lección T-020). Cualquier status no-2xx lanza `Error("Resend: <status> <name>: <message>")`; 401/403 lanza "Resend: RESEND_API_KEY rechazada". El `id` devuelto se loguea (`mail_sent`, T-051) para poder rastrear en el panel de Resend.
- `send.ts::getTransport`: lee `MAIL_TRANSPORT` (default `smtp`), instancia uno u otro; la interfaz pública (`sendMail`, `__setTransportForTests`) no cambia.
- `src/lib/server/env.ts` + `instrumentation.ts::register()` (T-051): con `MAIL_TRANSPORT=resend` y `RESEND_API_KEY` vacía, el arranque falla con "MAIL_TRANSPORT=resend requiere RESEND_API_KEY (webApp/.env.local)". Con `smtp` y sin `SMTP_HOST`, se conserva el comportamiento actual (falla de envío, no de arranque: local sin Mailpit sigue funcionando).
- `.env.example`: `MAIL_TRANSPORT`, `RESEND_API_KEY`, `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME` documentados, nunca con prefijo `NEXT_PUBLIC_`.
- `mail_log`, `notify.ts`, templates: sin cambios. La deduplicación sigue en `mail_log` (R-12); la `Idempotency-Key` de Resend se anota en el ADR como mejora posible, no se implementa (la interfaz no lleva id de evento y agregarlo es otro ticket).

### Criterios (Gherkin)
1. **Dado** un servidor HTTP falso que responde `200 { id }`, **cuando** `ResendTransport.send(msg)`, **entonces** resuelve, el request fue `POST /emails` con `Bearer` correcto y body `{ from, to: [..], subject, html, text }` con `from` formateado por `formatAddress`.
2. **Dado** el falso responde `422 { name: 'validation_error', message }`, **entonces** rechaza con ese `name` y `message` en el error.
3. **Dado** el falso acepta la conexión y nunca responde, **entonces** rechaza en `timeoutMs` (±200 ms), no cuelga, y `sendMail` devuelve `{ ok: false }` dentro de los 15 s.
4. **Dado** `MAIL_TRANSPORT=resend` sin `RESEND_API_KEY`, **cuando** arranca la app, **entonces** `register()` lanza con el mensaje claro y el proceso no sirve requests.
5. **Dado** `MAIL_TRANSPORT=smtp` (o ausente), **entonces** `sendMail` usa `SmtpTransport` y los tests actuales de T-020 pasan sin cambios.
6. **Dado** un subject con tildes y un nombre con coma, **entonces** el body JSON los lleva en UTF-8 tal cual (sin RFC 2047: eso es de SMTP) y el display-name va entrecomillado por `formatAddress`.
7. **Dado** `git grep RESEND_API_KEY`, **entonces** solo aparece en `env.ts`, `send.ts`, `.env.example` y docs; nunca en un componente cliente.

### Cómo se verifica
Vitest: `transport-resend.test.ts` con `node:http` falso (casos 1, 2, 3, 6) y `env.test.ts` (caso 4). `supabase/tests/mail-log.test.mjs` intacto (caso 5). Verificador ciego lee el ADR y busca una forma de colgar `sendMail` o de mandar a un tercero; ambas tienen que fallar. Gate del master. Un envío real contra Resend con `onboarding@resend.dev` como `from` es opcional y manual: sin dominio verificado no prueba nada del flujo de producción.

### Riesgo
Sin SPF/DKIM el primer envío real va a spam o rebota; está declarado en el ADR y no es de este bloque. `AbortSignal.timeout` existe en Node 18+ y en `@types/node` 20: se verifica en el plan que `tsc` lo acepta con el `lib` actual. El SMTP casero sigue sin AUTH: el ADR lo prohíbe fuera de Mailpit, y `env.ts` puede rechazar `SMTP_HOST` distinto de `localhost`/`127.0.0.1` en `NODE_ENV=production` como cinturón (criterio opcional, a decidir en el plan).
