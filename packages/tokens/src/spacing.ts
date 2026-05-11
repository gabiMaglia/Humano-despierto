/**
 * Spacing tokens · Humano demasiado Humano
 *
 * 4-point base grid. Values are in dp/px (numbers).
 * Compatible with React Native and Tailwind arbitrary values.
 *
 * Web Tailwind: p-[16px] or use with CSS-in-JS: padding: spacing[4]
 * RN StyleSheet: padding: spacing[4]  →  16
 *
 * Named aliases below map to the semantic roles used in the design:
 *   xs  → tight inner spacing (chips, pills)
 *   sm  → card inner padding compact
 *   md  → default section padding
 *   lg  → section vertical breathing room
 *   xl  → hero / full-bleed sections
 */

export const spacing = {
  0:   0,
  0.5: 2,
  1:   4,
  1.5: 6,
  2:   8,
  2.5: 10,
  3:   12,
  3.5: 14,
  4:   16,
  5:   20,
  6:   24,
  7:   28,
  8:   32,
  9:   36,
  10:  40,
  11:  44,
  12:  48,
  14:  56,
  16:  64,
  18:  72,
  20:  80,
  24:  96,
  28:  112,
  32:  128,
  36:  144,
  40:  160,
  48:  192,
  56:  224,
  64:  256,
} as const;

export type SpacingKey = keyof typeof spacing;

// ─── Semantic spacing aliases ─────────────────────────────────────────────────

export const inset = {
  /** Chip / pill inner padding */
  chip:    { vertical: spacing[1],  horizontal: spacing[3]  },  // 4 / 12
  /** Button */
  button:  { vertical: spacing[3.5],horizontal: spacing[6]  },  // 14 / 24
  /** Card inner */
  card:    { vertical: spacing[6],  horizontal: spacing[6]  },  // 24 / 24
  /** Card compact */
  cardSm:  { vertical: spacing[4],  horizontal: spacing[5]  },  // 16 / 20
  /** Section inner (container sides on mobile) */
  section: { vertical: spacing[10], horizontal: spacing[6]  },  // 40 / 24
  /** Page / screen edge padding */
  page:    { vertical: spacing[12], horizontal: spacing[8]  },  // 48 / 32
} as const;

export const gap = {
  /** Between icon and label */
  icon:    spacing[2],   // 8
  /** Between inline items */
  inline:  spacing[2.5], // 10
  /** Between stack items (list rows) */
  row:     spacing[4],   // 16
  /** Between cards in a grid */
  card:    spacing[6],   // 24
  /** Between sections */
  section: spacing[12],  // 48
  /** Between page-level blocks */
  block:   spacing[16],  // 64
} as const;
