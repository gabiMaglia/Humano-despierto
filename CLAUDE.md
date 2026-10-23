# CLAUDE.md

Guidance for Claude Code when working in this repository.

> **Every claim in this file was verified against the repo on 2026-10-21** (T-038). The previous
> version described a project that did not exist (see "History" at the bottom). If you change
> the code, change this file — a wrong CLAUDE.md is worse than none, because it is trusted.

## What this is
Online school for holistic trades: tarot, astrology, herbalism, reiki, magic.
Teachers publish courses whose lessons are **YouTube** videos with downloadable **Google Drive**
resources. Students take them through a Udemy-style curriculum and get persisted progress.
Three roles: `student`, `teacher`, `admin`.

## Current phase
**Phase 2 — real application.** Phase 1 (mocked frontend) is closed: it produced a
high-fidelity static shell with no application layer. Phase 2 turns it into a product.

**Courses are 100% on-demand** (ADR-004). No cohorts, no start dates, no live sessions, no
weekly drip. Active enrollment grants access to the whole curriculum at once.

**Payments are out of scope.** A student requests a course from its page; the row is born `requested` and an admin approves or rejects it in `/panel/admin` (T-043, D2).

## Where the project state lives
`engram/` (gitignored) is the source of truth for state, decisions and backlog:
`_state.md` · `01_requirements.md` · `02_architecture.md` (ADR-001..013) · `03_backlog.md` ·
`04_api_contracts.md` · `05_handoff_log.md` · `06_retro.md`.
**Read `engram/_state.md` first.** This file describes the terrain; the engram describes the work.

## Commands

### Setup
`nvm use` (`.nvmrc` = 22) · `cp webApp/.env.example webApp/.env.local` · usuarios de prueba en `README.md`.

### webApp (Next.js 16, React 19, Tailwind 4)
```bash
cd webApp
npm run dev      # dev server at localhost:3000
npm run lint     # ESLint
npx tsc --noEmit # typecheck
npm run build    # production build (don't run unless asked)
npm test         # Vitest, unit layer only (src/lib/**, Server Actions); no stack, no network
npm run test:unit # same as npm test
npm run test:e2e # Playwright; needs `npx supabase start`; starts its own `next dev` on localhost:3101
```

### Database (Postgres/Supabase schema + security tests)
```bash
cd webApp/supabase
npm install
npm test         # 825 tests, ~1-4 min, no Docker and no credentials needed
```
Runs against **PGlite** (embedded Postgres). Migrations in `migrations/` apply in filename order.

## Actual implementation state (measured, not aspirational)

| Area | State |
|------|-------|
| `webApp/src` | **~21.5k LOC** (non-test). 33 routes (`page.tsx`), 106 files under `components/`, no mock modules (`lib/mocks/` removed in T-053), `tokens.css`. Real Supabase queries everywhere. Tests: Vitest (594 unit tests in 72 files, next to the file) + Playwright (`e2e/`), T-039. |
| `webApp/supabase` | **Schema live.** 36 migrations (last `0037`; `0032` applies before `0031` by timestamp, independent), 22 tables, RLS + per-column grants + guard triggers, 825 mutation tests (PGlite). Private Storage bucket `uploads`: `avatars/` (T-042) and `covers/` (T-047), uploads only via service_role; its policies are only tested over HTTP by b1. Fixtures `@test.local` (admin, docente, alumna) in `seed.sql`, **local only**. |
| `mobileApp/` | **Empty directory.** No Expo scaffold. **Out of scope for Phase 2.** |
| `packages/tokens` | 763 LOC, complete — but **consumed by nobody**: `webApp` does not import it (it uses its own `src/styles/tokens.css`) and `mobileApp` does not exist. Kept for when mobile returns. |
| `Gentleman-Skills/` | **Empty directory.** Referenced by the old CLAUDE.md; there is nothing in it. |
| `design_handoff_humano_humano/` | Real. `reference/hifi/` (visual spec + data constants) and `reference/design-system/` (canonical tokens). Never ships. |

### Routes that exist
```
/                                   Landing (stats, disciplines, testimonials from the DB; lunar calendar computed)
/cursos  ·  /cursos/[slug]          Catalogue · course page (objectives, promo video, reviews)
/guias  ·  /guias/[slug]            Teacher directory + public profile
/diario  ·  /diario/[slug]          Blog, written by teachers
/entrar                             Login + register; honours ?next=, else lands by role
/entrar/recuperar                   Request a password-reset link (neutral reply)
/entrar/nueva-clave                 Choose a new password                     [link session]
/auth/callback                      GoTrue code exchange (confirmation, recovery)
/certificado/[code]                 Public certificate verification
/inscribirme/[curso]                308 -> /cursos/[curso] (T-043; enrollment is requested from the course page)
/panel                              Student dashboard                         [auth]
/panel/perfil                       Own profile, all three roles: name, bio,  [auth]
                                    phone, birth date, avatar
/leccion/[id]                       Lesson player: YouTube IFrame API,        [auth or preview]
                                    persisted progress, chapters, notes,      [owner teacher and
                                    Q&A tab (T-030)                            admin open it to
                                                                              answer and moderate]
/circulo  ·  /circulo/[curso]       Campus threads                            [auth]
/panel/docente/**                   Teacher panel: courses, modules, lessons, [teacher]
                                    chapters, resources, diario posts,
                                    announcements (`/panel/docente/anuncios`,
                                    T-031: drafts, publish + mail, withdraw)
/panel/admin                        Enrollments tab: request queue, grant by  [admin]
                                    mail + slug, searchable paged history
/panel/admin/{usuarios,cursos,invitaciones}  Admin tabs, ?q= search,     [admin]
                                    25 per page by keyset cursor (T-049)
/panel/admin/resenas                Review moderation: report queue, hide     [admin]
/panel/admin/anuncios               Withdraw published announcements (T-031)   [admin]
/invitacion/[token]                 Route Handler: accepts a teacher          [auth]
                                    invitation, refreshes the session claim
/invitacion/invalida                Neutral "invalid or expired" page
/api/csp-report                     POST only: logs csp_violation (no query strings), 20/min per IP
/opengraph-image                    Brand OG image (PNG 1200x630, vendored Cinzel, no network)
/cursos/[slug]/opengraph-image-<h>  Course OG image: cover (jpg/png) or generative card; 404 if not
                                    published. Next adds the -<hash> suffix under a dynamic segment
```
Any unknown route renders `src/app/not-found.tsx` (404, `noindex` injected by Next).
`/guias/[slug]` **is** the "Maestra" screen from the original 9-screen plan, renamed.
Auth is enforced twice: `src/proxy.ts` (session + JWT role for routing) and the server layouts
under `(app)/`, which re-read `profiles.role`.

### Known gaps (measured 2026-10-21, see `docs/superpowers/specs/2026-10-21-cierre-funcional-master.md`)
- **Resources are not downloadable.** `lesson_resources` are listed by name only; no route serves
  the Drive link after checking enrollment (T-044).
- **Google OAuth is wired but unproven against Google** (T-041): it needs the PO's OAuth client
  credentials (see "External dependencies"); e2e only intercepts `/auth/v1/authorize`.
- **Profiles are not editable** and there is no Storage usage (T-042).
- **Mail transport is chosen by `MAIL_TRANSPORT`** (T-054, ADR-014): `smtp` (default) is a bare
  client for Mailpit only (no AUTH, no TLS; with `NODE_ENV=production` a non-loopback
  `SMTP_HOST` refuses to boot); `resend` posts to Resend's HTTP API. `src/instrumentation.ts`
  validates the mail config in `register()` and the server does not start if it is invalid.
  A permanent provider failure retires the `mail_log` slot with `last_error`
  (`permanent:<status>/<name>`, migration 0036). After fixing a bad key or domain, recover with
  `delete from mail_log where sent_at is null and last_error ~ '^permanent:(401|403)/'` —
  never delete the `409` rows: that mail may already have gone out.
- **No error capture** (SP-6). The CSP ships Report-Only (T-052) until its enforce criterion is met.

## Architecture
ADRs live in `engram/02_architecture.md` (ADR-001..013).

**Backend lives inside Next.js** (ADR-001) — Server Actions + Route Handlers. There is no
separate API. Business logic goes in `src/lib/server/`, framework-agnostic, each file starting
with `import 'server-only'`.

**Supabase** (ADR-002) provides Auth + Postgres + RLS. Two clients, never mixed:
the user-session client (anon key + JWT, subject to RLS) for everything ordinary, and the
`service_role` client (bypasses RLS) **only** for privileged operations.

**Auth by mail** (T-040, D8): `enable_confirmations = true`, so `signUp` leaves no session. The
session is born in `/auth/callback`, which also sends the welcome mail (deduped by `mail_log`).
`?next=` is sanitised only by `src/lib/auth/safe-next.ts`; without a valid `next` the login
lands by `profiles.role` (`/panel/admin`, `/panel/docente`, `/panel`). Mail links must be
opened in the browser that requested them: the PKCE verifier lives in a cookie. Use
`localhost` (not `127.0.0.1`) in the browser, matching `SITE_URL` and `site_url`.
Every auth redirect is a trusted origin + `safeNext`: `getSiteUrl()` on the server (never the
`Origin` header), `window.location.origin` on the client; GoTrue's exact allow-list
(`additional_redirect_urls`, fixed host and port, `**` only after `/auth/callback`) is the final
authority. Adding a port means adding its exact entry there. Local e2e needs
`SMTP_HOST=127.0.0.1` and `SMTP_PORT=54325` in `webApp/.env.local` for the app's own mails.

**Google OAuth** (T-041, D5): `/entrar` → `signInWithOAuth` (PKCE) → GoTrue → `/auth/callback`,
the same exchange as mail confirmation. Logic lives in `src/lib/auth/google.ts`. GoTrue links a
Google identity to the account with the same verified mail automatically (and drops that
account's unconfirmed identities). `handle_new_user` takes `full_name` or `name` from the
provider and leaves the name empty if it looks like a locator, instead of aborting the sign-up.
Without a valid `next` the `redirect_to` carries no query and `resolveAuthCallback` lands by
`profiles.role` read after the exchange, so the role-based landing applies to every login
(password, Google, mail confirmation); a failed role read falls back to `/panel`.

### Security rules that are enforced by the schema — do not fight them
These exist because the same class of bug reached production in a sibling project. They are
covered by mutation tests that fail loudly if you regress them.

1. **`REVOKE ALL` then `GRANT` per column — never revoke a single column.** Supabase ships
   `ALTER DEFAULT PRIVILEGES ... GRANT ALL ON TABLES`, so every new table is born with
   table-level UPDATE, against which a per-column revoke is a no-op.
2. **Grants are a whitelist.** A new column is not exposed by accident — you must add it by
   hand to `0003_privileges.sql`. That is deliberate friction.
3. **RLS policies read `profiles.role`, never the JWT claim.** A claim is a snapshot taken when
   the token was issued and survives a role downgrade until refresh. The claim is for routing
   and optimistic UI only.
4. **Paid-content locators are `service_role` only** — `lessons.video_id`,
   `lesson_resources.drive_file_id`, `lesson_resources.url`. RLS filters *rows*, not *columns*,
   and every authenticated user sees the rows of any published course. Serve them from a Server
   Action after checking enrollment. A `select *` on `lessons` from the client fails with 42501.
   Same for personal data: `profiles.phone` and `profiles.birth_date` have no SELECT for any
   client role; the owner reads them through `my_private_profile()`. A `select *` on `profiles`
   from the client fails with 42501. Avatars and course covers live in the private bucket
   `uploads` (`avatars/<uid>/<uuid>.<ext>`, `covers/<course_id>/<uuid>.<ext>`).
   **No session writes to `uploads`** (D-34, migration 0030): the bucket only checks size and the
   declared MIME, so a client INSERT policy let users bypass the server's byte check. Uploads go
   through the Server Action with `service_role` (`uploadAsServer`) after validating magic bytes
   and ownership; sessions keep only SELECT (owner signs her own) and DELETE.
   `courses.cover_path` is tied to `covers/<id>/` by the CHECK `courses_cover_path_no_locator`.
   Every `uploads` URL is signed server-side for 1 h; public pages sign through
   `signPublicUploadUrls`, which calls `connection()`: a page that shows a signed URL must never
   be prerendered.
5. **`lesson_progress.completed` is derived, never declared.** It is computed from
   `seconds_watched` against `lessons.duration_seconds` at 90%, in INSERT and UPDATE, with no
   `service_role` bypass. **With `duration_seconds = 0` nobody can ever complete a lesson** —
   load the duration first.
6. **Money and time are integers in their smallest unit.** `price_cents`, `duration_seconds`.
   Never float, never string. Formatting belongs to the view.
7. **Q&A text is read by the whole cohort, so it carries both R-3 halves.** `lesson_questions`
   and `lesson_answers` have no `anon` grant; their columns live in the "session" class
   (`columnasConSesion`, `tests/locator-session-class.test.mjs`), not in the anon one. The
   owner teacher (`teacher_id` **and** `profiles.role = 'teacher'`) and the admin open the player
   to answer and moderate, but never write progress or notes (ADR-003 as extended by T-030).
8. **A published announcement is frozen, even for `service_role`.** It already went out by mail:
   `course_announcements_freeze_published` rejects any change to `title`, `body`, `status` or
   `published_at` once published. Publishing is a Server Action with `service_role` after
   `assertOwnsCourse`; the mail runs in `after()` and never blocks or breaks the publish.
9. **A role change outside `updateUserRoleAction` exists only in `accept_teacher_invitation`**
   (T-049; `service_role` only, mail confirmed and equal to the invited one, only
   `student -> teacher`). `teacher_invitations` has no client access at all. The invitation
   token lives only in the mail; the DB keeps its sha256. The admin lists (`admin_list_*`,
   `admin_user_by_email`) are `service_role`-only SQL functions: the mail lives in `auth.users`.
10. **The CSP lives in `src/proxy.ts`, built by `buildCsp` (`src/lib/security/csp.ts`), with a
    nonce per request** (T-052). That is why the root layout calls `await connection()`: a
    prerendered page has no nonce and its scripts die under enforce. Do not make a page static.
    `style-src 'unsafe-inline'` is deliberate (inline `style={{}}` everywhere) until the reskin.
    It ships as **Report-Only**; `CSP_ENFORCE=true` only renames the header. Every Playwright test
    imports `test` from `e2e/fixtures.ts`, whose `cspGuard` fails the test on any violation: that
    suite green in dev and with `E2E_PROD=1`, `check-seo.sh` green against `next start`, and a
    manual player session are the criterion to enforce. A new third-party origin goes into
    `buildCsp` with its test, never into a page.
11. **Every write a client can trigger is rate-limited** (T-050). Each export of a `"use server"`
    file and each `route.ts` method goes through `withRateLimit("<its own name>", fn, onLimited)`
    with a limit in `src/lib/rate-limit/limits.ts`, or sits in `RATE_LIMIT_EXEMPT` with a written
    reason; `src/lib/rate-limit/coverage.test.ts` fails otherwise (and on `export default`/`{ }`/`*`
    in those files). Counters live in `rate_limit_buckets` (`check_rate_limit`, `service_role`
    only, fixed window). The quota is per `getClaims().sub`, else per IP from `x-forwarded-for`
    (the production proxy must REPLACE that header). If the limiter is down or mute the action
    proceeds and logs `rate_limit_backend_down` (fail-open, on purpose). `sendMail` has its own
    global and per-recipient cap. Auth flows are limited by GoTrue, not here.

**Review moderation** (T-037, ADR-012): only the course's teacher or an admin can report a review
(`course_review_reports`, RLS via `can_report_review`, which reads `profiles.role`). Hiding,
unhiding and dismissing go ONLY through the `moderate_*` SQL functions (execute for
`service_role` only), called from `panel/admin/actions.ts` after `requireAdmin()`
(`src/lib/server/admin.ts`). They are the only writers of `hidden_*` and `resolved_*`. A teacher
cannot review her own course (D-20, enforced by the `course_reviews` guard with no bypass).

## Design language (hard constraints)
- Dark theme `Cosmos`: bg `#0a0418` · ink `#ede4ff` · lila `#c4b5fd` · gold `#f5d76e`.
  Second theme `pergamino` (light).
- Fonts: Cinzel (display) · Quicksand (body) · Cormorant Garamond (quote) · Cardo (alt).
- **No emojis.** Unicode glyphs only: `☉ ☽ ✦ ◐ ◑ ○ ● ✧`.
- **No raster images.** Inline SVG and Unicode only. (`three.js` powers a WebGL canvas on the
  login screen — that is the one exception, and it is deliberate.) User uploads are the declared
  exception (S-A): avatar (T-042) and course cover (T-047), jpg/png/webp only, never SVG.
- Roman-numeral watermarks, Starfield background, ZodiacWheel (`wheelSpin` 60s).
- Source of truth: `design_handoff_humano_humano/reference/design-system/`. **Copy** tokens into
  the app; never import across apps. Read the hi-fi JSX for spec and data — do not paste its HTML.

## Coding standards
- TypeScript strict everywhere.
- No comments unless the WHY is non-obvious.
- `cn()` = `clsx` + `tailwind-merge`.
- Server Components by default; `'use client'` only for interactivity or animation.
- There are no mocks left (T-053 removed the last one). Do not add mocks.

## External dependencies not yet provisioned
Four things block work and require the repo owner's accounts:
- **Supabase cloud project** does not exist. The schema has only run on PGlite (`npm test`,
  no PostgREST) and on the local Supabase stack (`supabase start`, where
  `harness/b1-postgrest-attacks.sh` exercises the HTTP surface). Re-run b1 against the cloud
  instance before any release (locale-dependent CHECKs, see migration 0012). The Storage
  policies (`uploads_avatars_*`, `uploads_covers_*`) are verified only by b1.
- **YouTube Data API v3 key** (`YOUTUBE_API_KEY`, server-side, no `NEXT_PUBLIC_` prefix) —
  lesson duration is resolved by the server from the video, not typed by the teacher.
- **Google OAuth client** (`SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` / `_SECRET`, in
  `webApp/.env.local`; read by the Supabase CLI on `supabase start`, not by Next). Local
  authorised redirect URI: `http://127.0.0.1:54321/auth/v1/callback`. Without them the Google
  button ends in a Google error page.
- **Resend** (ADR-014): account, `RESEND_API_KEY`, and the domain of `MAIL_FROM_ADDRESS` verified
  with SPF (`TXT` + `MX`, or `CNAME`, on `send.<domain>`) and DKIM (`TXT` on
  `resend._domainkey.<domain>`), checkable with `nslookup -type=TXT resend._domainkey.<domain>`.
  Without it every real send is a `403`, which retires the slot (see recovery above).

Secrets go in `webApp/.env.local` (gitignored). `SUPABASE_SERVICE_ROLE_KEY` and `RESEND_API_KEY`
must **never** carry the `NEXT_PUBLIC_` prefix: the first bypasses RLS entirely, the second sends
mail as the school, and the prefix would ship either to the browser.

## History
Until 2026-10-21 this file still described the state of 2026-08-06 (3.6k LOC, 11 routes, "the
player has no video"); corrected by T-038 after QA rejected it.
Until 2026-08-06 this file claimed Phase 1, "webApp: scaffold only, Landing not started", and
"mobileApp: Landing implemented, ZodiacWheel built". All three were false in both directions:
the webApp had 11 routes and the mobileApp was an empty directory. It also pointed at a
`Gentleman-Skills/curated/` skill set that does not exist. Corrected by ticket T-009.
