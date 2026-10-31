# Deploy en Netlify (plan gratuito) — runbook

T-091. Netlify + Supabase Cloud, URL `*.netlify.app`, sin dominio propio. El mail real es T-090.

## 1. Conectar el repo

1. Netlify > Add new project > Import an existing project > GitHub > este repo, rama `main`.
2. No toques los campos de build: los fija `netlify.toml` en la raíz (`base = "webApp"`,
   `npm run build`, `publish = ".next"`, Node 22). Netlify instala solo el adaptador
   `@netlify/plugin-nextjs` (OpenNext v5) al detectar Next.
3. Antes del primer deploy cargá las variables (sección 2). Las `NEXT_PUBLIC_*` y `SITE_URL` se
   **hornean en el build**: si cambian, hay que redeployar (Deploys > Trigger deploy > Clear cache
   and deploy).

## 2. Variables de entorno

Site configuration > Environment variables. Scopes: **Builds, Functions y Runtime** (el proxy corre
como Edge Function y lee `SITE_URL`, `CSP_ENFORCE` y las de Supabase en cada request).

| Variable | Tipo | Valor / de dónde sale |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | pública | Supabase > Project Settings > API > Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | pública | Supabase > API > `anon` key |
| `SUPABASE_SERVICE_ROLE_KEY` | **secreta** | Supabase > API > `service_role`. Nunca con `NEXT_PUBLIC_` |
| `SITE_URL` | pública, server-only | `https://<tu-sitio>.netlify.app`, sin `/` final |
| `MAIL_TRANSPORT` | pública | `resend` o lo que defina T-090 (ver nota) |
| `RESEND_API_KEY` | **secreta** | Solo con `MAIL_TRANSPORT=resend` |
| `MAIL_FROM_ADDRESS` | pública | Remitente; con resend, de dominio verificado |
| `MAIL_FROM_NAME` | pública | `Humano Despierto` (ASCII con resend) |
| `YOUTUBE_API_KEY` | **secreta** | Google Cloud, YouTube Data API v3. Sin ella no se publica una lección |
| `CRON_SECRET` | **secreta** | ≥16 caracteres al azar. Protege `GET /api/mail/retry` |
| `CSP_ENFORCE` | pública | Vacía (Report-Only) hasta cumplir el criterio de T-052 |
| `RATE_LIMIT_BACKEND` | pública | Vacía (= `postgres`). Nunca `memory` en producción |
| `NEXT_PUBLIC_WHATSAPP_URL` | pública, opcional | `https://wa.me/...`; vacía oculta el botón |

No van a Netlify: `SUPABASE_DB_URL` (solo seed y scripts locales), `SMTP_HOST`/`SMTP_PORT` (el SMTP
casero es solo Mailpit; con `NODE_ENV=production` y un host fuera de loopback el server no arranca,
hasta que T-090 lo cambie), `SUPABASE_AUTH_EXTERNAL_GOOGLE_*` (las lee el CLI local; en la nube el
cliente OAuth se carga en Supabase > Authentication > Providers > Google).

**Mail (nota):** `src/instrumentation.ts` valida la config al arrancar y, si es inválida, el server
no atiende. Hasta que entre T-090, las opciones válidas son `MAIL_TRANSPORT=resend` con su clave, o
`smtp` sin `SMTP_HOST` (arranca, pero cada envío falla y queda en `mail_log`).

Marcá como secretas (Contains secret values) solo las cuatro **secretas**. Si marcás una
`NEXT_PUBLIC_*` como secreta, el secret scanning de Netlify corta el build, porque su valor está
(a propósito) en el bundle del navegador.

## 3. Supabase Cloud

- Authentication > URL Configuration: **Site URL** = el mismo `SITE_URL`; **Redirect URLs** =
  `https://<tu-sitio>.netlify.app/auth/callback**` (exacta, sin comodín en el host).
- Las migraciones de `webApp/supabase/migrations/` aplicadas; nada de `seed.fixtures.sql`,
  `seed.sql` ni `demo.sql` en la nube.
- Re-correr `webApp/supabase/harness/b1-postgrest-attacks.sh` contra el proyecto cloud (CLAUDE.md).

## 4. Qué verificar después del primer deploy

1. `curl -sI https://<sitio>/` → 200 y `content-security-policy-report-only` con `nonce-...`
   distinto en dos requests seguidos, y con la URL real de Supabase en `connect-src` (prueba de
   que el proxy ve las variables).
2. `/`, `/cursos`, `/entrar`, `/sitemap.xml` (URLs con `https://<sitio>`), `/robots.txt`,
   `/opengraph-image` y el OG de un curso (`/cursos/<slug>/opengraph-image-<hash>`, link en el
   `<head>` de la ficha) → 200.
3. `/panel` sin sesión → 307 a `/entrar?next=%2Fpanel`.
4. Una foto de Unsplash del landing carga por `/_next/image` (Netlify la reescribe a su Image CDN,
   `/.netlify/images`) sin violación de CSP en la consola.
5. **IP del rate limit:** mandá 21 POST a `/api/csp-report` (límite 20/min por IP) cambiando
   `X-Forwarded-For` en cada uno. Tiene que dar 429 en el 21°. Después, en el SQL editor:
   `select key from rate_limit_buckets where key like 'cspReport%' order by 1 desc limit 5;` →
   tu IP real, no las inventadas.
6. Registro + mail de confirmación + login (según el transporte de T-090), y un anuncio publicado:
   el mail sale en `after()`; revisar `mail_log.sent_at`.
7. Publicar un curso desde el panel y ver que la portada cambia (`revalidateTag`) sin redeploy.
8. Netlify > Logs > Functions y Edge Functions: sin `config_invalid` ni `site_url_missing`.

## 5. Límites del plan gratuito que importan

- Functions sincrónicas cortan a los ~10 s por defecto. `GET /api/mail/retry` declara
  `maxDuration = 300`, que Netlify no respeta; y Netlify no tiene Vercel Cron: para dispararlo hace
  falta un cron externo o una Scheduled Function (fuera de T-091).
- Lo que corre en `after()` (mails) sigue después de la respuesta, pero dentro del mismo tope de la
  función.
- Si la build falla por secret scanning con una variable pública, ver arriba; no apagues el scanning
  entero.
