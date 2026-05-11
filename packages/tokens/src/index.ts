/**
 * @humano/tokens — Design system for Humano demasiado Humano
 *
 * Shared between webApp (Next.js + Tailwind) and mobileApp (Expo + React Native).
 * All values are framework-agnostic TypeScript constants.
 *
 * Quick import:
 *   import { colors, textStyles, spacing, borderRadius, shadows, animations } from '@humano/tokens';
 *
 * Granular imports (tree-shakeable):
 *   import { cosmos, pergamino, lila, gold } from '@humano/tokens/colors';
 *   import { textStyles, fontFamilies, fontSize } from '@humano/tokens/typography';
 *   import { spacing, inset, gap } from '@humano/tokens/spacing';
 *   import { radius, borderRadius } from '@humano/tokens/radius';
 *   import { shadows } from '@humano/tokens/shadows';
 *   import { animations, duration } from '@humano/tokens/animations';
 */

export * from './colors';
export * from './typography';
export * from './spacing';
export * from './radius';
export * from './shadows';
export * from './animations';

// ─── Convenience: theme object ────────────────────────────────────────────────
// Consume as: theme.cosmos.colors.bg0 | theme.pergamino.colors.ink

import { cosmos, pergamino, lila, gold, magenta } from './colors';
import { fontFamilies, fontWeights, fontSize, textStyles, lineHeightRatio, letterSpacingRatio, webClamp } from './typography';
import { spacing, inset, gap } from './spacing';
import { radius, borderRadius } from './radius';
import { shadows } from './shadows';
import { animations, duration, easing } from './animations';

export const theme = {
  cosmos: {
    colors:  cosmos,
    palette: { lila, gold, magenta },
  },
  pergamino: {
    colors:  pergamino,
    palette: { lila, gold, magenta },
  },
  typography: {
    fontFamilies,
    fontWeights,
    fontSize,
    textStyles,
    lineHeightRatio,
    letterSpacingRatio,
    webClamp,
  },
  spacing: { scale: spacing, inset, gap },
  radius:  { scale: radius, semantic: borderRadius },
  shadows,
  animations: { presets: animations, duration, easing },
} as const;

export type ThemeMode = 'cosmos' | 'pergamino';
