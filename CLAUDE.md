# CLAUDE.md

Guidance for Claude Code when working in this repository.

> **Every claim in this file was verified against the repo on 2026-08-06.** The previous
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
`_state.md` · `01_requirements.md` · `02_architecture.md` (ADR-001..008) · `03_backlog.md` ·
`04_api_contracts.md` · `05_handoff_log.md` · `06_retro.md`.
**Read `engram/_state.md` first.** This file describes the terrain; the engram describes the work.

## Commands

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
npm test         # 96 tests, ~20s, no Docker and no credentials needed
```
Runs against **PGlite** (embedded Postgres). Migrations in `migrations/` apply in filename order.

## Actual implementation state (measured, not aspirational)

| Area | State |
|------|-------|
| `webApp/src` | **~3.6k LOC.** 11 route files, 24 components, 8 mock modules, `tokens.css`, zustand store. |
| `webApp/supabase` | **Schema live.** 6 migrations, 9 tables, RLS + per-column grants + guard triggers, 96 mutation tests. |
| `mobileApp/` | **Empty directory.** No Expo scaffold. **Out of scope for Phase 2.** |
| `packages/tokens` | 763 LOC, complete — but **consumed by nobody**: `webApp` does not import it (it uses its own `src/styles/tokens.css`) and `mobileApp` does not exist. Kept for when mobile returns. |
| `Gentleman-Skills/` | **Empty directory.** Referenced by the old CLAUDE.md; there is nothing in it. |
| `design_handoff_humano_humano/` | Real. `reference/hifi/` (visual spec + data constants) and `reference/design-system/` (canonical tokens). Never ships. |

### Routes that exist
```
/                          Landing
/cursos                    Catalogue
/cursos/[slug]             Course detail
/panel                     Student dashboard          [auth]
/leccion/[id]              Lesson player              [auth]
/inscribirme/[curso]       Checkout (draws only, charges nothing)
/diario                    Blog
/circulo                   Community                  [auth]
/entrar                    Login
/guias  ·  /guias/[slug]   Teacher directory + profile
```
`/guias/[slug]` **is** the "Maestra" screen from the original 9-screen plan, renamed.
There is no `/maestras/` route and none is planned.

### Known traps in the existing frontend
The shell is visually finished but was never wired. Before trusting a page, check:
- **Dynamic routes may discard their param.** Several pages did `await params;` without using
  the value, so every slug rendered the same content. Fixed per-route by ticket — verify the
  one you are touching.
- **The player has no video.** `leccion/[id]` draws tarot cards in CSS with a decorative play
  button and a hardcoded progress bar. There is no `<video>` and no embed.
- **Auth was theatre.** `useAuthStore` invented a user and `AuthGate` only redirected inside a
  `useEffect` — pages were reachable with JS disabled.
- **Mocks disagree with each other.** The same concept appears in three incompatible shapes,
  and everything is a string (`"$ 240"`, `"52:18"`). The DB schema was designed from scratch;
  do not derive types from the mocks.

## Architecture

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
- Mock data in `src/lib/mocks/` — being replaced by real queries, ticket by ticket.

## External dependencies not yet provisioned
Two things block work and require the repo owner's accounts:
- **Supabase project** — the schema has never run against real Postgres. Everything is verified
  against PGlite, which does **not** run PostgREST, so the HTTP attack surface is unexercised.
- **YouTube Data API v3 key** (`YOUTUBE_API_KEY`, server-side, no `NEXT_PUBLIC_` prefix) —
  lesson duration is resolved by the server from the video, not typed by the teacher.

Secrets go in `webApp/.env.local` (gitignored). `SUPABASE_SERVICE_ROLE_KEY` must **never** carry
the `NEXT_PUBLIC_` prefix: it bypasses RLS entirely and the prefix would ship it to the browser.

## History
Until 2026-08-06 this file claimed Phase 1, "webApp: scaffold only, Landing not started", and
"mobileApp: Landing implemented, ZodiacWheel built". All three were false in both directions:
the webApp had 11 routes and the mobileApp was an empty directory. It also pointed at a
`Gentleman-Skills/curated/` skill set that does not exist. Corrected by ticket T-009.
