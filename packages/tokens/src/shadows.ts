/**
 * Shadow tokens · Humano demasiado Humano
 *
 * Each shadow ships in two formats:
 *   web    → CSS box-shadow string (use in style={{ boxShadow }} or Tailwind arbitrary)
 *   native → React Native shadow props (spread into StyleSheet object)
 *
 * Usage on web:
 *   style={{ boxShadow: shadows.cosmosCard.web }}
 *
 * Usage on RN:
 *   const { shadowColor, shadowOffset, shadowOpacity, shadowRadius, elevation } = shadows.cosmosCard.native;
 *   <View style={{ ...shadows.cosmosCard.native }} />
 */

export const shadows = {
  cosmosCard: {
    web: '0 20px 60px -20px rgba(0,0,0,0.5), 0 0 0 1px rgba(196,181,253,0.18)',
    native: {
      shadowColor:   '#000000',
      shadowOffset:  { width: 0, height: 10 },
      shadowOpacity: 0.45,
      shadowRadius:  24,
      elevation:     12,
    },
  },

  goldGlow: {
    web: '0 0 30px -10px rgba(245,215,110,0.4)',
    native: {
      shadowColor:   '#f5d76e',
      shadowOffset:  { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius:  20,
      elevation:     6,
    },
  },

  lilaGlow: {
    web: '0 0 40px -10px rgba(196,181,253,0.35)',
    native: {
      shadowColor:   '#c4b5fd',
      shadowOffset:  { width: 0, height: 0 },
      shadowOpacity: 0.35,
      shadowRadius:  24,
      elevation:     6,
    },
  },

  soft: {
    web: '0 20px 50px -20px rgba(0,0,0,0.5)',
    native: {
      shadowColor:   '#000000',
      shadowOffset:  { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius:  20,
      elevation:     8,
    },
  },

  /** Button primary hover — gold CTA */
  buttonPrimary: {
    web: '0 0 30px -8px rgba(245,215,110,0.5)',
    native: {
      shadowColor:   '#f5d76e',
      shadowOffset:  { width: 0, height: 2 },
      shadowOpacity: 0.5,
      shadowRadius:  12,
      elevation:     4,
    },
  },
} as const;

export type ShadowKey = keyof typeof shadows;
