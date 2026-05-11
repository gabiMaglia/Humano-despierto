# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is
Online school for holistic trades: tarot, astrology, herbalism, reiki, magic. The product is a **bi-platform app** (web + mobile) built from a complete hi-fi design handoff.

## Current phase
**Phase 1 — Frontend only, all data mocked.** No real backend. Both apps (web + mobile) are built in parallel by specialized agents.

## Commands

### webApp (Next.js)
```bash
cd webApp
npm run dev      # dev server at localhost:3000
npm run lint     # ESLint
npm run build    # production build (don't run unless asked)
```

### mobileApp (Expo)
```bash
cd mobileApp
npx expo start           # Metro + QR code (Expo Go)
npx expo start --ios     # iOS simulator
npx expo start --android # Android emulator
npm run lint             # expo lint
```

### packages/tokens
No build step — TypeScript source files are consumed directly via `"main": "src/index.ts"`.

## Monorepo structure
```
HUMANODEMASIADOHUMANO/
├── webApp/                          # Next.js App Router — React 19, Tailwind 4
├── mobileApp/                       # Expo 55 — React Native 0.83, Expo Router
├── packages/
│   └── tokens/                      # @humano/tokens — shared design tokens (LIVE)
├── design_handoff_humano_humano/    # Hi-fi reference — DO NOT run in prod
│   └── reference/
│       ├── hifi/                    # 9 screens as HTML preview + JSX + CSS
│       └── design-system/          # tokens.css + tailwind.config.js (canonical)
└── Gentleman-Skills/               # Curated Claude Code skills (read-only reference)
    └── curated/                    # nextjs-15, react-19, react-native, tailwind-4, etc.
```

## Shared package: @humano/tokens

Already implemented at `packages/tokens/`. The mobile app already imports it via `file:../packages/tokens`.

**Granular imports (preferred for tree-shaking):**
```ts
import { cosmos, lila, gold }              from '@humano/tokens/colors';
import { textStyles, fontFamilies }        from '@humano/tokens/typography';
import { spacing, inset, gap }             from '@humano/tokens/spacing';
import { radius, borderRadius }            from '@humano/tokens/radius';
import { shadows }                         from '@humano/tokens/shadows';
import { animations, duration }            from '@humano/tokens/animations';
```

**Two themes available:** `cosmos` (dark, primary) and `pergamino` (light).

**RN caveat:** CSS variables don't work in React Native. The mobile app uses `mobileApp/src/constants/theme.ts` for RN-specific constants (`BottomTabInset`, `MaxContentWidth`) alongside `@humano/tokens`. Do not break this dual-import pattern.

## Multi-agent team

| Agent | File | Responsibility |
|-------|------|----------------|
| **Architect** | `.claude/agents/architect.md` | Monorepo tooling, shared lib design, tech decisions |
| **Web Frontend** | `.claude/agents/web-frontend.md` | Next.js screens from design handoff |
| **Mobile Frontend** | `.claude/agents/mobile-frontend.md` | Expo screens from design handoff |
| **PO** | `.claude/agents/po.md` | Feature scope, acceptance criteria, screen priority |

### How to orchestrate
1. **PO** defines acceptance criteria for each screen before implementation starts.
2. **Web Frontend** and **Mobile Frontend** work in parallel, per screen.
3. Agents communicate through this CLAUDE.md and their own app-level CLAUDE.md files.

## Current implementation state

| App | Status |
|-----|--------|
| webApp | Next.js scaffold only — design tokens NOT applied yet, Landing screen (I) not started |
| mobileApp | Landing screen (I) implemented; ZodiacWheel component built |
| packages/tokens | Fully implemented — colors, typography, spacing, radius, shadows, animations |

## Design system (canonical source of truth)
- Tokens: `design_handoff_humano_humano/reference/design-system/tokens.css`
- Tailwind config: `design_handoff_humano_humano/reference/design-system/tailwind.config.js`
- **Copy** these to each app — do not import cross-app.
- Hi-fi references: `design_handoff_humano_humano/reference/hifi/*.jsx` — read for data constants and visual spec, **do not copy HTML directly**.

## 9 screens (implementation order)
```
I    Landing         /                       → desktop.jsx + mobile.jsx
II   Catálogo        /cursos                 → catalog.jsx
III  Curso detalle   /cursos/[slug]          → course-detail.jsx
IV   Maestra         /maestras/[slug]        → maestra.jsx
V    Dashboard       /panel          [auth]  → dashboard.jsx
VI   Reproductor     /leccion/[id]   [auth]  → player.jsx
VII  Checkout        /inscribirme/[curso]    → checkout.jsx
VIII Diario          /diario                 → blog.jsx
IX   Comunidad       /circulo        [auth]  → comunidad.jsx
```

## webApp target structure (follow exactly)
```
webApp/src/
  app/
    (marketing)/
      page.tsx                    ← Landing (screen I)
      cursos/page.tsx             ← Catálogo (screen II)
      cursos/[slug]/page.tsx      ← Curso detalle (screen III)
      maestras/[slug]/page.tsx    ← Maestra (screen IV)
      diario/page.tsx             ← Diario (screen VIII)
      circulo/page.tsx            ← Comunidad (screen IX)
    (app)/
      panel/page.tsx              ← Dashboard (screen V)
      leccion/[id]/page.tsx       ← Reproductor (screen VI)
      inscribirme/[curso]/page.tsx← Checkout (screen VII)
    layout.tsx                    ← fonts + theme provider + Starfield
  components/
    cosmos/                       ← shared primitives (Starfield, ZodiacWheel, GoldButton…)
    layout/                       ← Nav, Footer
    landing/ catalog/ course/ player/ checkout/ community/ dashboard/
  lib/
    mocks/                        ← data constants from hifi JSX files
    utils/
      cn.ts                       ← clsx + tailwind-merge
      roman.ts                    ← number → roman numeral
      moon-phase.ts
  styles/
    globals.css                   ← @import tokens.css + Tailwind base
    tokens.css                    ← copied from design-system/
```

## Design language (key constants)
- **Dark theme** (`Cosmos`): bg `#0a0418` → ink `#ede4ff` → accent lila `#c4b5fd` → gold `#f5d76e`
- **Fonts**: Cinzel (display) · Quicksand (body) · Cormorant Garamond (quote) · Cardo (alt)
- **No emojis** — Unicode glyphs only: `☉ ☽ ✦ ◐ ◑ ○ ● ✧`
- **No raster images** — SVG inline + Unicode only
- Roman numeral watermarks, Starfield background, ZodiacWheel animation (`wheelSpin` 60s)
- Mock auth: check `lib/mocks/user.ts` for session state — no real auth needed

## Coding standards
- TypeScript strict everywhere
- No comments unless the WHY is non-obvious
- Mock data lives in `lib/mocks/` (web) and `src/lib/mocks/` (mobile) — constants extracted from hifi JSX files
- `cn()` utility via `clsx` + `tailwind-merge` (webApp only — not applicable in RN)
- Prefer Server Components in Next.js; `'use client'` only for interactivity/animations

## Gentleman-Skills available
Located at `Gentleman-Skills/curated/`. Read the SKILL.md before implementing any relevant feature:
- `nextjs-15` — App Router patterns
- `react-19` — React 19 patterns
- `react-native` (community) — RN patterns
- `tailwind-4` — Tailwind v4 patterns (breaking changes from v3)
- `typescript` — strict TS
- `zustand-5` — state management
- `zod-4` — validation
