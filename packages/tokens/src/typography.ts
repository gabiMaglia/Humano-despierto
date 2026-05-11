/**
 * Typography tokens · Humano demasiado Humano
 *
 * Font families:
 *   display  → Cinzel         (headings, roman numerals, eyebrows)
 *   body     → Quicksand      (paragraphs, UI, forms, nav)
 *   quote    → Cormorant Garamond (quotes, italic, emotional voice)
 *   alt      → Cardo          (manuscript variant / tweak)
 *
 * Font size values are numbers (device-independent pixels).
 * Web can use them directly or as Tailwind arbitrary values: text-[28px]
 * React Native uses them as-is in StyleSheet.
 *
 * Display sizes on web use clamp() for fluid scaling — see `webClamp`.
 * On RN, use the `native` value directly.
 *
 * Letter spacing:
 *   Values are ratios (fraction of fontSize). Multiply by fontSize for RN:
 *   letterSpacing: letterSpacingRatio.eyebrow * fontSize.eyebrow  → 2.2
 *   On web use em: letter-spacing: 0.22em
 *
 * Line height:
 *   Values are ratios. Multiply by fontSize for RN:
 *   lineHeight: lineHeightRatio.relaxed * fontSize.body → 21.7
 *   On web use unitless: line-height: 1.55
 */

import { colors } from './colors';

// ─── Font families ────────────────────────────────────────────────────────────

export const fontFamilies = {
  /**
   * Cinzel — display, headings, roman numerals, eyebrow labels
   * Web: font-family: 'Cinzel', serif
   * RN:  requires @expo-google-fonts/cinzel
   *      fontFamily: 'Cinzel_400Regular' | 'Cinzel_600SemiBold' | 'Cinzel_700Bold'
   */
  display: 'Cinzel',

  /**
   * Quicksand — body copy, UI labels, forms, navigation
   * RN:  fontFamily: 'Quicksand_300Light' | 'Quicksand_400Regular' | 'Quicksand_500Medium' | 'Quicksand_600SemiBold'
   */
  body: 'Quicksand',

  /**
   * Cormorant Garamond — quotes, bajadas, emotional italic voice
   * RN:  fontFamily: 'CormorantGaramond_400Regular_Italic'
   */
  quote: 'Cormorant Garamond',

  /**
   * Cardo — manuscript variant (optional tweak)
   * RN:  fontFamily: 'Cardo_400Regular'
   */
  alt: 'Cardo',
} as const;

export type FontFamily = keyof typeof fontFamilies;

// ─── Font weight ──────────────────────────────────────────────────────────────

export const fontWeights = {
  light:    '300',
  regular:  '400',
  medium:   '500',
  semiBold: '600',
  bold:     '700',
} as const;

export type FontWeight = keyof typeof fontWeights;

// ─── Font size scale (dp / px) ───────────────────────────────────────────────

export const fontSize = {
  xs:         9,   // eyebrow-sm
  sm:         10,  // eyebrow
  base:       14,  // body default
  md:         16,  // body medium
  lg:         17,  // quote
  xl:         18,  // h4
  '2xl':      22,  // h3
  '3xl':      28,  // h2
  // Display sizes — fixed values for RN; web uses clamp (see webClamp below)
  displayMd:  38,  // web: clamp(28px, 3.5vw, 44px)
  displayLg:  54,  // web: clamp(36px, 5vw, 72px)
  displayXl:  72,  // web: clamp(48px, 7vw, 96px)
} as const;

export type FontSizeKey = keyof typeof fontSize;

/**
 * Web-only clamp values for fluid display sizes.
 * Use these in CSS/Tailwind, not in React Native.
 */
export const webClamp = {
  displayXl: 'clamp(48px, 7vw, 96px)',
  displayLg: 'clamp(36px, 5vw, 72px)',
  displayMd: 'clamp(28px, 3.5vw, 44px)',
} as const;

// ─── Line height ratios ───────────────────────────────────────────────────────
// RN: lineHeight = lineHeightRatio.X * fontSize.Y

export const lineHeightRatio = {
  none:     1.0,    // display-xl
  tight:    1.05,   // display-lg
  snug:     1.1,    // display-md
  normal:   1.3,    // headings h2-h4
  relaxed:  1.55,   // body copy
  loose:    1.6,    // quote / long-form
} as const;

export type LineHeightKey = keyof typeof lineHeightRatio;

// ─── Letter spacing ratios ────────────────────────────────────────────────────
// Web: letter-spacing: Xem   RN: letterSpacing = ratio * fontSize

export const letterSpacingRatio = {
  none:    0,
  tight:   0.04,   // display-md (+4%)
  heading: 0.05,   // display-lg (+5%)
  display: 0.06,   // display-xl (+6%)
  cosmic:  0.18,   // ritual buttons
  ritual:  0.25,   // widest — used in button labels
  eyebrow: 0.22,   // eyebrow labels
} as const;

export type LetterSpacingKey = keyof typeof letterSpacingRatio;

// ─── Semantic text styles ─────────────────────────────────────────────────────
// Pre-composed style objects. Consume directly in RN StyleSheet or web style props.
// Web: override fontSize with webClamp values for display sizes.

export const textStyles = {
  displayXl: {
    fontFamily:       fontFamilies.display,
    fontSize:         fontSize.displayXl,
    lineHeight:       lineHeightRatio.none,
    letterSpacingEm:  letterSpacingRatio.display,  // use as: `0.06em` on web
    letterSpacingPx:  Math.round(fontSize.displayXl * letterSpacingRatio.display), // 4 → RN
    fontWeight:       fontWeights.bold,
  },

  displayLg: {
    fontFamily:       fontFamilies.display,
    fontSize:         fontSize.displayLg,
    lineHeight:       lineHeightRatio.tight,
    letterSpacingEm:  letterSpacingRatio.heading,
    letterSpacingPx:  Math.round(fontSize.displayLg * letterSpacingRatio.heading),
    fontWeight:       fontWeights.semiBold,
  },

  displayMd: {
    fontFamily:       fontFamilies.display,
    fontSize:         fontSize.displayMd,
    lineHeight:       lineHeightRatio.snug,
    letterSpacingEm:  letterSpacingRatio.tight,
    letterSpacingPx:  Math.round(fontSize.displayMd * letterSpacingRatio.tight),
    fontWeight:       fontWeights.medium,
  },

  h2: {
    fontFamily:       fontFamilies.display,
    fontSize:         fontSize['3xl'],       // 28
    lineHeight:       lineHeightRatio.normal,
    letterSpacingEm:  0.02,
    letterSpacingPx:  1,
    fontWeight:       fontWeights.medium,
  },

  h3: {
    fontFamily:       fontFamilies.display,
    fontSize:         fontSize['2xl'],       // 22
    lineHeight:       lineHeightRatio.normal,
    letterSpacingEm:  0.02,
    letterSpacingPx:  1,
    fontWeight:       fontWeights.medium,
  },

  h4: {
    fontFamily:       fontFamilies.display,
    fontSize:         fontSize.xl,           // 18
    lineHeight:       lineHeightRatio.normal,
    letterSpacingEm:  0.02,
    letterSpacingPx:  1,
    fontWeight:       fontWeights.medium,
  },

  body: {
    fontFamily:       fontFamilies.body,
    fontSize:         fontSize.base,         // 14
    lineHeight:       lineHeightRatio.relaxed,
    letterSpacingEm:  0,
    letterSpacingPx:  0,
    fontWeight:       fontWeights.regular,
  },

  bodyMd: {
    fontFamily:       fontFamilies.body,
    fontSize:         fontSize.md,           // 16
    lineHeight:       lineHeightRatio.relaxed,
    letterSpacingEm:  0,
    letterSpacingPx:  0,
    fontWeight:       fontWeights.regular,
  },

  quote: {
    fontFamily:       fontFamilies.quote,
    fontSize:         fontSize.lg,           // 17
    lineHeight:       lineHeightRatio.loose,
    letterSpacingEm:  0,
    letterSpacingPx:  0,
    fontWeight:       fontWeights.regular,
    fontStyle:        'italic' as const,
  },

  eyebrow: {
    fontFamily:       fontFamilies.display,
    fontSize:         fontSize.sm,           // 10
    lineHeight:       lineHeightRatio.normal,
    letterSpacingEm:  letterSpacingRatio.eyebrow,
    letterSpacingPx:  Math.round(fontSize.sm * letterSpacingRatio.eyebrow),  // 2
    fontWeight:       fontWeights.semiBold,
    textTransform:    'uppercase' as const,
  },

  eyebrowSm: {
    fontFamily:       fontFamilies.display,
    fontSize:         fontSize.xs,           // 9
    lineHeight:       lineHeightRatio.normal,
    letterSpacingEm:  letterSpacingRatio.eyebrow,
    letterSpacingPx:  Math.round(fontSize.xs * letterSpacingRatio.eyebrow),  // 2
    fontWeight:       fontWeights.semiBold,
    textTransform:    'uppercase' as const,
  },

  label: {
    fontFamily:       fontFamilies.body,
    fontSize:         12,
    lineHeight:       lineHeightRatio.normal,
    letterSpacingEm:  0,
    letterSpacingPx:  0,
    fontWeight:       fontWeights.medium,
  },

  /**
   * Link — inherits body size; color applied by theme (cosmos.accent or pergamino.accent)
   * Apply `color: colors[theme].accent` alongside this style.
   */
  link: {
    fontFamily:       fontFamilies.body,
    fontSize:         fontSize.base,
    lineHeight:       lineHeightRatio.relaxed,
    letterSpacingEm:  0,
    letterSpacingPx:  0,
    fontWeight:       fontWeights.medium,
  },

  /**
   * Navigation label — top nav, tab bar
   */
  nav: {
    fontFamily:       fontFamilies.body,
    fontSize:         fontSize.base,         // 14
    lineHeight:       lineHeightRatio.normal,
    letterSpacingEm:  0.01,
    letterSpacingPx:  0,
    fontWeight:       fontWeights.medium,
  },

  /**
   * Button text — ritual CTA style
   * Pair with letterSpacing: letterSpacingRatio.cosmic * fontSize
   */
  button: {
    fontFamily:       fontFamilies.display,
    fontSize:         12,
    lineHeight:       lineHeightRatio.normal,
    letterSpacingEm:  letterSpacingRatio.cosmic,
    letterSpacingPx:  Math.round(12 * letterSpacingRatio.cosmic),  // 2
    fontWeight:       fontWeights.medium,
    textTransform:    'uppercase' as const,
  },
} as const;

export type TextStyleKey = keyof typeof textStyles;
