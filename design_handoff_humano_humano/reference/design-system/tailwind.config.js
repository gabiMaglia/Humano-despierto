// tailwind.config.js · Humano · Humano
// Copiá este archivo a tu proyecto Tailwind v3+ y extendé tu config.
module.exports = {
  content: ['./**/*.{html,js,jsx,ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        cosmos: {
          0:  '#0a0418',
          1:  '#140828',
          2:  '#1f0f3a',
          surface: '#1a0e2e',
          elev:    '#2a1a4d',
        },
        pergamino: {
          0: '#f5efe2',
          1: '#ebe2ce',
          2: '#ddd0b6',
          surface: '#f8f3e7',
          elev:    '#ffffff',
        },
        ink: {
          DEFAULT: '#ede4ff',
          soft:    '#b8a8d0',
          faint:   '#8070a0',
        },
        lila: {
          50:  '#f5f3ff',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#5b21b6',
          900: '#2e1065',
          DEFAULT: '#c4b5fd',
        },
        gold: {
          300: '#fde68a',
          400: '#f5d76e',
          500: '#d4a843',
          700: '#8a6520',
          DEFAULT: '#f5d76e',
        },
        magenta: '#ec4899',
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body:    ['Quicksand', 'sans-serif'],
        quote:   ['"Cormorant Garamond"', 'serif'],
        cardo:   ['Cardo', 'serif'],
      },
      fontSize: {
        // Display ramps used in hi-fi
        'display-xl': ['clamp(48px, 7vw, 96px)', { lineHeight: '1', letterSpacing: '0.06em' }],
        'display-lg': ['clamp(36px, 5vw, 72px)', { lineHeight: '1.05', letterSpacing: '0.05em' }],
        'display-md': ['clamp(28px, 3.5vw, 44px)', { lineHeight: '1.1', letterSpacing: '0.04em' }],
        eyebrow:      ['10px',  { letterSpacing: '0.2em', textTransform: 'uppercase' }],
        eyebrow-sm:   ['9px',   { letterSpacing: '0.22em' }],
      },
      letterSpacing: {
        ritual: '0.25em',
        cosmic: '0.18em',
      },
      borderRadius: {
        ritual: '6px',
        scroll: '8px',
        pill:   '100px',
      },
      boxShadow: {
        'cosmos-card':  '0 20px 60px -20px rgba(0,0,0,0.5), 0 0 0 1px rgba(196,181,253,0.18)',
        'gold-glow':    '0 0 30px -10px rgba(245,215,110,0.4)',
        'lila-glow':    '0 0 40px -10px rgba(196,181,253,0.35)',
      },
      backgroundImage: {
        'starfield':
          `radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.5), transparent),
           radial-gradient(1px 1px at 80% 70%, rgba(245,215,110,0.5), transparent),
           radial-gradient(1px 1px at 60% 20%, rgba(196,181,253,0.5), transparent)`,
        'cosmic-vignette':
          'radial-gradient(ellipse at 50% 40%, transparent 0%, transparent 30%, rgba(10,4,24,0.6) 70%, #0a0418 100%)',
        'gold-stroke':
          'linear-gradient(90deg, rgba(245,215,110,0.06), rgba(196,181,253,0.04))',
      },
      keyframes: {
        breathe:   { '0%,100%': { opacity: 0.7, transform: 'scale(1)' }, '50%': { opacity: 1, transform: 'scale(1.04)' } },
        wheelSpin: { from: { transform: 'rotate(0)' }, to: { transform: 'rotate(360deg)' } },
        twinkle:   { '0%,100%': { opacity: 0.3 }, '50%': { opacity: 1 } },
      },
      animation: {
        breathe:   'breathe 5s ease-in-out infinite',
        wheelSpin: 'wheelSpin 60s linear infinite',
        twinkle:   'twinkle 3s ease-in-out infinite',
      },
    },
  },
  plugins: [
    function({ addComponents, theme }) {
      addComponents({
        '.btn-ritual': {
          display: 'inline-flex', alignItems: 'center', gap: '10px',
          padding: '14px 24px', borderRadius: '6px',
          fontFamily: theme('fontFamily.display'),
          fontSize: '12px', letterSpacing: '0.18em', textTransform: 'uppercase',
          fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
        },
        '.btn-ritual-primary': {
          background: 'linear-gradient(180deg,#f5d76e,#d4a843)',
          color: '#0a0418',
          boxShadow: '0 0 30px -8px rgba(245,215,110,0.5)',
          '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 0 40px -6px rgba(245,215,110,0.7)' },
        },
        '.btn-ritual-ghost': {
          background: 'transparent', color: '#ede4ff',
          border: '1px solid rgba(196,181,253,0.4)',
          '&:hover': { borderColor: '#f5d76e', color: '#f5d76e' },
        },
        '.eyebrow': {
          fontFamily: theme('fontFamily.display'),
          fontSize: '10px', letterSpacing: '0.22em',
          textTransform: 'uppercase', color: '#f5d76e',
        },
        '.cosmos-card': {
          background: '#1a0e2e',
          border: '1px solid rgba(196,181,253,0.18)',
          borderRadius: '12px',
          boxShadow: '0 20px 60px -20px rgba(0,0,0,0.5)',
        },
      });
    },
  ],
};
