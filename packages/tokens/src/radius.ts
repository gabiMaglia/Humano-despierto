/**
 * Border radius tokens · Humano demasiado Humano
 *
 * Values in dp/px. Compatible with web and React Native.
 * Web: borderRadius: '6px'  or  rounded-[6px] in Tailwind
 * RN:  borderRadius: radius.md
 */

export const radius = {
  none: 0,
  sm:   4,    // inputs, tight elements
  md:   6,    // cards, buttons (default — named "ritual" in design)
  lg:   8,    // large surfaces, modals
  xl:   12,   // cosmos-card
  '2xl':16,
  full: 9999, // pills, chips, search, avatars
} as const;

export type RadiusKey = keyof typeof radius;

// ─── Semantic aliases ─────────────────────────────────────────────────────────

export const borderRadius = {
  input:   radius.sm,   // 4
  button:  radius.md,   // 6
  card:    radius.xl,   // 12
  pill:    radius.full, // 9999
  avatar:  radius.full,
  badge:   radius.full,
  modal:   radius.lg,   // 8
} as const;
