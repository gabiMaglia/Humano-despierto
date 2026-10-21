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

**Payments are out of scope.** Enrollment is granted manually by an admin.

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
```

### Database (Postgres/Supabase schema + security tests)
```bash
cd webApp/supabase
npm install
npm test         # 477 tests, ~1-4 min, no Docker and no credentials needed
```
Runs against **PGlite** (embedded Postgres). Migrations in `migrations/` apply in filename order.

## Actual implementation state (measured, not aspirational)

| Area | State |
|------|-------|
| `webApp/src` | **~13.9k LOC.** 22 routes (`page.tsx`), 57 files under `components/`, 1 mock module left (`lib/mocks/landing.ts`, scheduled for removal in T-053), `tokens.css`. Real Supabase queries everywhere else. No test runner yet (T-039 in progress). |
| `webApp/supabase` | **Schema live.** 25 migrations (last `0026`), 14 tables, RLS + per-column grants + guard triggers, 477 mutation tests (PGlite). Fixtures `@test.local` (admin, docente, alumna) in `seed.sql`, **local only**. |
| `mobileApp/` | **Empty directory.** No Expo scaffold. **Out of scope for Phase 2.** |
| `packages/tokens` | 763 LOC, complete — but **consumed by nobody**: `webApp` does not import it (it uses its own `src/styles/tokens.css`) and `mobileApp` does not exist. Kept for when mobile returns. |
| `Gentleman-Skills/` | **Empty directory.** Referenced by the old CLAUDE.md; there is nothing in it. |
| `design_handoff_humano_humano/` | Real. `reference/hifi/` (visual spec + data constants) and `reference/design-system/` (canonical tokens). Never ships. |

### Routes that exist
```
/                                   Landing (hero/testimonials still from the last mock)
/cursos  ·  /cursos/[slug]          Catalogue · course page (objectives, promo video, reviews)
/guias  ·  /guias/[slug]            Teacher directory + public profile
/diario  ·  /diario/[slug]          Blog, written by teachers
/entrar                             Login + register (client-side Supabase Auth)
/certificado/[code]                 Public certificate verification
/inscribirme/[curso]                Checkout MOCK: no handlers, replaced by T-043 (request + admin approval)
/panel                              Student dashboard                         [auth]
/leccion/[id]                       Lesson player: YouTube IFrame API,        [auth or preview]
                                    persisted progress, chapters, notes
/circulo  ·  /circulo/[curso]       Campus threads                            [auth]
/panel/docente/**                   Teacher panel: courses, modules, lessons, [teacher]
                                    chapters, resources, diario posts
/panel/admin                        Roles, manual enrollments, publish        [admin]
```
`/guias/[slug]` **is** the "Maestra" screen from the original 9-screen plan, renamed.
Auth is enforced twice: `src/proxy.ts` (session + JWT role for routing) and the server layouts
under `(app)/`, which re-read `profiles.role`.

### Known gaps (measured 2026-10-21, see `docs/superpowers/specs/2026-10-21-cierre-funcional-master.md`)
- **Resources are not downloadable.** `lesson_resources` are listed by name only; no route serves
  the Drive link after checking enrollment (T-044).
- **No password reset, no email confirmation, no Google OAuth** (T-040, T-041). Login always
  redirects to `/panel` regardless of role.
- **Profiles are not editable** and there is no Storage usage (T-042).
- **Mail transport is a bare SMTP client for Mailpit**: no AUTH, no TLS (T-054).
- **No rate limiting, no error capture, no CSP** (SP-6).

## Architecture
ADRs live in `engram/02_architecture.md` (ADR-001..013).

**Backend lives inside Next.js** (ADR-001) — Server Actions + Route Handlers. There is no
separate API. Business logic goes in `src/lib/server/`, framework-agnostic, each file starting
with `import 'server-only'`.

**Supabase** (ADR-002) provides Auth + Postgres + RLS. Two clients, never mixed:
the user-session client (anon key + JWT, subject to RLS) for everything ordinary, and the
`service_role` client (bypasses RLS) **only** for privileged operations.

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
5. **`lesson_progress.completed` is derived, never declared.** It is computed from
   `seconds_watched` against `lessons.duration_seconds` at 90%, in INSERT and UPDATE, with no
   `service_role` bypass. **With `duration_seconds = 0` nobody can ever complete a lesson** —
   load the duration first.
6. **Money and time are integers in their smallest unit.** `price_cents`, `duration_seconds`.
   Never float, never string. Formatting belongs to the view.

## Design language (hard constraints)
- Dark theme `Cosmos`: bg `#0a0418` · ink `#ede4ff` · lila `#c4b5fd` · gold `#f5d76e`.
  Second theme `pergamino` (light).
- Fonts: Cinzel (display) · Quicksand (body) · Cormorant Garamond (quote) · Cardo (alt).
- **No emojis.** Unicode glyphs only: `☉ ☽ ✦ ◐ ◑ ○ ● ✧`.
- **No raster images.** Inline SVG and Unicode only. (`three.js` powers a WebGL canvas on the
  login screen — that is the one exception, and it is deliberate.)
- Roman-numeral watermarks, Starfield background, ZodiacWheel (`wheelSpin` 60s).
- Source of truth: `design_handoff_humano_humano/reference/design-system/`. **Copy** tokens into
  the app; never import across apps. Read the hi-fi JSX for spec and data — do not paste its HTML.

## Coding standards
- TypeScript strict everywhere.
- No comments unless the WHY is non-obvious.
- `cn()` = `clsx` + `tailwind-merge`.
- Server Components by default; `'use client'` only for interactivity or animation.
- The only mock left is `src/lib/mocks/landing.ts` (T-053 removes it). Do not add mocks.

## External dependencies not yet provisioned
Two things block work and require the repo owner's accounts:
- **Supabase project** — the schema has never run against real Postgres. Everything is verified
  against PGlite, which does **not** run PostgREST, so the HTTP attack surface is unexercised.
- **YouTube Data API v3 key** (`YOUTUBE_API_KEY`, server-side, no `NEXT_PUBLIC_` prefix) —
  lesson duration is resolved by the server from the video, not typed by the teacher.

Secrets go in `webApp/.env.local` (gitignored). `SUPABASE_SERVICE_ROLE_KEY` must **never** carry
the `NEXT_PUBLIC_` prefix: it bypasses RLS entirely and the prefix would ship it to the browser.

## History
Until 2026-10-21 this file still described the state of 2026-08-06 (3.6k LOC, 11 routes, "the
player has no video"); corrected by T-038 after QA rejected it.
Until 2026-08-06 this file claimed Phase 1, "webApp: scaffold only, Landing not started", and
"mobileApp: Landing implemented, ZodiacWheel built". All three were false in both directions:
the webApp had 11 routes and the mobileApp was an empty directory. It also pointed at a
`Gentleman-Skills/curated/` skill set that does not exist. Corrected by ticket T-009.
