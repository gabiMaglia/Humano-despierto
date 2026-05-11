/**
 * Animation tokens · Humano demasiado Humano
 *
 * Durations and configs shared between web (CSS / Framer Motion)
 * and React Native (Reanimated 4).
 *
 * Web: use `duration.breathe` as the `duration` prop in Framer Motion,
 *      or in CSS keyframe `animation: breathe Xs ease-in-out infinite`.
 *
 * RN (Reanimated 4):
 *   withRepeat(withSequence(
 *     withTiming(1, { duration: duration.breathe / 2 }),
 *     withTiming(0.7, { duration: duration.breathe / 2 }),
 *   ), -1, true)
 */

// ─── Durations (ms) ───────────────────────────────────────────────────────────

export const duration = {
  instant:  100,   // micro-interactions
  fast:     200,   // hover transitions, button press
  normal:   350,   // modal open / navigation
  slow:     500,   // section transitions
  breathe:  5000,  // glyph breathing (☉ ✦)
  twinkle:  3000,  // starfield star twinkle
  wheelSpin:60000, // zodiac wheel full rotation
  ping:     1600,  // online avatar dot
} as const;

export type DurationKey = keyof typeof duration;

// ─── Easing ───────────────────────────────────────────────────────────────────

export const easing = {
  /** Standard ease for most UI transitions */
  standard:   'ease-in-out',
  /** Enter: elements coming into view */
  enter:      'ease-out',
  /** Exit: elements leaving */
  exit:       'ease-in',
  /** Linear — wheel spin, infinite rotations */
  linear:     'linear',
  /**
   * Spring config for Reanimated — hover lift on cards
   * withSpring(value, springConfig.card)
   */
  spring: {
    card: { damping: 15, stiffness: 200 },
    modal:{ damping: 20, stiffness: 300 },
  },
} as const;

// ─── Named animations ─────────────────────────────────────────────────────────

export const animations = {
  /**
   * breathe — glyph pulse (☉ ✦ in hero sections)
   * Opacity: 0.7 → 1, Scale: 1 → 1.04, 5s ease-in-out infinite
   */
  breathe: {
    duration:   duration.breathe,
    easing:     easing.standard,
    repeat:     Infinity,
    opacityFrom:0.7,
    opacityTo:  1,
    scaleFrom:  1,
    scaleTo:    1.04,
    /** CSS keyframe string for web */
    css: 'breathe 5s ease-in-out infinite',
  },

  /**
   * wheelSpin — zodiac wheel continuous rotation
   * 60s linear infinite
   */
  wheelSpin: {
    duration: duration.wheelSpin,
    easing:   easing.linear,
    repeat:   Infinity,
    from:     0,
    to:       360,
    /** CSS keyframe string for web */
    css: 'wheelSpin 60s linear infinite',
    /** Counter-rotation (inner rings) */
    cssReverse: 'wheelSpin 60s linear infinite reverse',
  },

  /**
   * twinkle — starfield star opacity pulse
   * Opacity: 0.3 → 1, 3s ease-in-out infinite
   */
  twinkle: {
    duration:   duration.twinkle,
    easing:     easing.standard,
    repeat:     Infinity,
    opacityFrom:0.3,
    opacityTo:  1,
    /** CSS keyframe string for web */
    css: 'twinkle 3s ease-in-out infinite',
  },

  /**
   * ping — online status dot pulse
   * Scale: 1 → 1.4, Opacity: 0.75 → 0, 1.6s ease-out infinite
   */
  ping: {
    duration:   duration.ping,
    easing:     easing.exit,
    repeat:     Infinity,
    scaleTo:    1.4,
    opacityFrom:0.75,
    opacityTo:  0,
  },

  /**
   * Card hover lift
   * translateY: 0 → -4, border-color → gold, 200ms
   */
  cardHover: {
    duration:     duration.fast,
    easing:       easing.standard,
    translateY:   -4,
  },
} as const;

export type AnimationKey = keyof typeof animations;
