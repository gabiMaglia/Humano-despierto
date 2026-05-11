/**
 * Color tokens · Humano demasiado Humano
 *
 * Two themes:
 *   cosmos    — dark default (deep violet space)
 *   pergamino — light variant (warm parchment)
 *
 * Usage:
 *   Web (Tailwind arbitrary): bg-[--hh-bg-0]  OR  style={{ backgroundColor: colors.cosmos.bg0 }}
 *   RN:  style={{ backgroundColor: colors.cosmos.bg0 }}
 */

// ─── Palette scales ──────────────────────────────────────────────────────────

export const lila = {
  50:  '#f5f3ff',
  200: '#ddd6fe',
  300: '#c4b5fd',  // primary accent (dark mode)
  400: '#a78bfa',
  500: '#8b5cf6',
  600: '#7c3aed',  // deep accent / CTAs ghost
  700: '#5b21b6',  // primary accent (light mode)
  900: '#2e1065',
} as const;

export const gold = {
  300: '#fde68a',
  400: '#f5d76e',  // ceremonial CTAs, watermarks (dark mode)
  500: '#d4a843',  // deep gold
  700: '#8a6520',  // ceremonial CTAs (light mode)
} as const;

export const magenta = '#ec4899' as const;

// ─── Theme: Cosmos (dark default) ────────────────────────────────────────────

export const cosmos = {
  // Backgrounds
  bg0:        '#0a0418',  // deepest background
  bg1:        '#140828',  // elevated background
  bg2:        '#1f0f3a',  // card background
  surface:    '#1a0e2e',  // card base
  surfaceElev:'#2a1a4d',  // card hover / elevated

  // Lines / dividers
  line:       'rgba(196, 181, 253, 0.18)',
  lineStrong: 'rgba(196, 181, 253, 0.40)',

  // Text
  ink:        '#ede4ff',  // primary text
  inkSoft:    '#b8a8d0',  // secondary text
  inkFaint:   '#8070a0',  // muted / labels

  // Accents (reference palette scale above)
  accent:     lila[300],   // primary accent
  accentDeep: lila[600],
  cta:        gold[400],   // primary CTA color
  ctaDeep:    gold[500],
  magenta,
} as const;

// ─── Theme: Pergamino (light variant) ────────────────────────────────────────

export const pergamino = {
  // Backgrounds
  bg0:        '#f5efe2',
  bg1:        '#ebe2ce',
  bg2:        '#ddd0b6',
  surface:    '#f8f3e7',
  surfaceElev:'#ffffff',

  // Lines / dividers
  line:       'rgba(91, 42, 134, 0.20)',
  lineStrong: 'rgba(91, 42, 134, 0.45)',

  // Text
  ink:        '#1f1430',
  inkSoft:    '#5a4570',
  inkFaint:   '#9888a8',

  // Accents (adjusted for light readability)
  accent:     lila[700],   // #5b2a86
  accentDeep: lila[600],
  cta:        gold[700],   // #8a6520
  ctaDeep:    gold[500],
  magenta,
} as const;

// ─── Semantic tokens (theme-aware object) ─────────────────────────────────────
// Usage: pick `colors[theme].bg0` where theme = 'cosmos' | 'pergamino'

export const colors = {
  cosmos,
  pergamino,
  lila,
  gold,
  magenta,
} as const;

export type Theme = keyof typeof colors;
export type CosmosColor = keyof typeof cosmos;
export type PergaminoColor = keyof typeof pergamino;
