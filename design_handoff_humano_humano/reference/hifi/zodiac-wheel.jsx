/* ============================================
   ZODIAC WHEEL SVG — geometría sagrada animada
   ============================================ */

const ZODIAC_SIGNS = [
  { glyph: '♈', name: 'Aries' },
  { glyph: '♉', name: 'Tauro' },
  { glyph: '♊', name: 'Géminis' },
  { glyph: '♋', name: 'Cáncer' },
  { glyph: '♌', name: 'Leo' },
  { glyph: '♍', name: 'Virgo' },
  { glyph: '♎', name: 'Libra' },
  { glyph: '♏', name: 'Escorpio' },
  { glyph: '♐', name: 'Sagitario' },
  { glyph: '♑', name: 'Capricornio' },
  { glyph: '♒', name: 'Acuario' },
  { glyph: '♓', name: 'Piscis' },
];

const ZodiacWheel = ({ size = 540 }) => {
  const cx = 100, cy = 100;
  return (
    <svg className="wheel-svg" viewBox="0 0 200 200" width={size} height={size}>
      <defs>
        <radialGradient id="wheelBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(196,181,253,0.05)"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r="95" fill="url(#wheelBg)"/>

      {/* outer rotating ring */}
      <g className="wheel-rotate">
        <circle cx={cx} cy={cy} r="92" fill="none" stroke="var(--line-strong)" strokeWidth="0.4"/>
        <circle cx={cx} cy={cy} r="88" fill="none" stroke="var(--line)" strokeWidth="0.3" strokeDasharray="0.5 1.5"/>
        {/* zodiac glyphs */}
        {ZODIAC_SIGNS.map((s, i) => {
          const angle = (i * 30 - 90) * Math.PI / 180;
          const r = 90;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          return (
            <g key={i}>
              <line
                x1={cx + Math.cos(angle) * 76}
                y1={cy + Math.sin(angle) * 76}
                x2={cx + Math.cos(angle) * 84}
                y2={cy + Math.sin(angle) * 84}
                stroke="var(--line-strong)"
                strokeWidth="0.4"
              />
              <text
                x={x} y={y}
                fontSize="6"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--lila)"
                fontFamily="var(--font-display)"
                style={{ animation: `wheelSpin 120s linear infinite reverse`, transformOrigin: `${x}px ${y}px` }}
              >
                {s.glyph}
              </text>
            </g>
          );
        })}
      </g>

      {/* middle ring counter-rotating */}
      <g className="wheel-rotate-rev">
        <circle cx={cx} cy={cy} r="70" fill="none" stroke="var(--gold)" strokeWidth="0.3" strokeDasharray="0.3 2" opacity="0.6"/>
        {/* 12 ticks */}
        {Array.from({ length: 36 }).map((_, i) => {
          const angle = i * 10 * Math.PI / 180;
          return (
            <line key={i}
              x1={cx + Math.cos(angle) * 66}
              y1={cy + Math.sin(angle) * 66}
              x2={cx + Math.cos(angle) * (i % 3 === 0 ? 71 : 69)}
              y2={cy + Math.sin(angle) * (i % 3 === 0 ? 71 : 69)}
              stroke="var(--line-strong)"
              strokeWidth="0.3"
            />
          );
        })}
      </g>

      {/* sacred geometry — hexagram core */}
      <g opacity="0.7" stroke="var(--lila)" fill="none" strokeWidth="0.4">
        <polygon points={`${cx},${cy-50} ${cx+43},${cy+25} ${cx-43},${cy+25}`}/>
        <polygon points={`${cx},${cy+50} ${cx+43},${cy-25} ${cx-43},${cy-25}`}/>
        <circle cx={cx} cy={cy} r="50" strokeDasharray="1 1"/>
      </g>

      {/* connecting lines from center */}
      {[0,60,120,180,240,300].map(a => {
        const angle = a * Math.PI / 180;
        return (
          <line key={a}
            x1={cx} y1={cy}
            x2={cx + Math.cos(angle) * 50}
            y2={cy + Math.sin(angle) * 50}
            stroke="var(--gold)"
            strokeWidth="0.2"
            opacity="0.4"
          />
        );
      })}
    </svg>
  );
};

window.ZodiacWheel = ZodiacWheel;

/* sigils for floating */
const Sigil = ({ icon = "✦", className = "" }) => (
  <span className={`sigil-float ${className}`}>{icon}</span>
);
window.Sigil = Sigil;

/* discipline icons */
const DisciplineIcon = {
  Astrology: ({ className }) => (
    <svg className={`discipline-icon ${className||''}`} viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="14"/>
      <circle cx="20" cy="20" r="9" strokeDasharray="1 1"/>
      <line x1="20" y1="6" x2="20" y2="34"/>
      <line x1="6" y1="20" x2="34" y2="20"/>
      <circle cx="20" cy="20" r="3" fill="currentColor"/>
    </svg>
  ),
  Tarot: ({ className }) => (
    <svg className={`discipline-icon ${className||''}`} viewBox="0 0 40 40">
      <rect x="10" y="6" width="20" height="28" rx="2"/>
      <rect x="13" y="9" width="14" height="22" rx="1" strokeDasharray="1 1"/>
      <circle cx="20" cy="20" r="3"/>
      <path d="M20 14 L20 26 M14 20 L26 20"/>
    </svg>
  ),
  Reiki: ({ className }) => (
    <svg className={`discipline-icon ${className||''}`} viewBox="0 0 40 40">
      <path d="M14 30 L14 18 Q14 14 20 14 Q26 14 26 18 L26 30"/>
      <circle cx="20" cy="10" r="3"/>
      <path d="M10 26 Q14 22 18 26 M22 26 Q26 22 30 26"/>
    </svg>
  ),
  Herbal: ({ className }) => (
    <svg className={`discipline-icon ${className||''}`} viewBox="0 0 40 40">
      <path d="M20 34 L20 12"/>
      <path d="M20 22 Q12 18 10 10 Q18 12 20 20"/>
      <path d="M20 26 Q28 22 30 14 Q22 16 20 24"/>
      <path d="M20 16 Q14 14 14 8 Q18 10 20 14"/>
    </svg>
  ),
};
window.DisciplineIcon = DisciplineIcon;
