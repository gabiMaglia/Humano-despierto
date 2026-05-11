const ZODIAC = [
  "♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓",
] as const;

interface Props { size?: number; className?: string; }

export default function ZodiacWheel({ size = 540, className }: Props) {
  const cx = 100, cy = 100;
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      aria-hidden
    >
      <defs>
        <radialGradient id="wheelBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="rgba(196,181,253,0.05)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>

      <circle cx={cx} cy={cy} r={95} fill="url(#wheelBg)" />

      {/* Outer rotating ring — zodiac glyphs */}
      <g className="wheel-rotate">
        <circle cx={cx} cy={cy} r={92} fill="none" stroke="rgba(196,181,253,0.4)"  strokeWidth={0.4} />
        <circle cx={cx} cy={cy} r={88} fill="none" stroke="rgba(196,181,253,0.18)" strokeWidth={0.3} strokeDasharray="0.5 1.5" />
        {ZODIAC.map((glyph, i) => {
          const θ = (i * 30 - 90) * Math.PI / 180;
          const r = 90;
          const x = cx + Math.cos(θ) * r;
          const y = cy + Math.sin(θ) * r;
          return (
            <g key={glyph}>
              <line
                x1={cx + Math.cos(θ) * 76} y1={cy + Math.sin(θ) * 76}
                x2={cx + Math.cos(θ) * 84} y2={cy + Math.sin(θ) * 84}
                stroke="rgba(196,181,253,0.4)" strokeWidth={0.4}
              />
              <text
                x={x} y={y}
                fontSize={6}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#c4b5fd"
                style={{ fontFamily: "serif" }}
              >{glyph}</text>
            </g>
          );
        })}
      </g>

      {/* Middle counter-rotating ring — dense ticks */}
      <g className="wheel-rotate-rev">
        <circle cx={cx} cy={cy} r={70} fill="none" stroke="#f5d76e" strokeWidth={0.3} strokeDasharray="0.3 2" opacity={0.6} />
        {Array.from({ length: 36 }).map((_, i) => {
          const θ = (i * 10) * Math.PI / 180;
          const outer = i % 3 === 0 ? 71 : 69;
          return (
            <line key={i}
              x1={cx + Math.cos(θ) * 66} y1={cy + Math.sin(θ) * 66}
              x2={cx + Math.cos(θ) * outer} y2={cy + Math.sin(θ) * outer}
              stroke="rgba(196,181,253,0.4)" strokeWidth={0.3}
            />
          );
        })}
      </g>

      {/* Sacred geometry — hexagram core */}
      <g opacity={0.7} stroke="#c4b5fd" fill="none" strokeWidth={0.4}>
        <polygon points={`${cx},${cy-50} ${cx+43},${cy+25} ${cx-43},${cy+25}`} />
        <polygon points={`${cx},${cy+50} ${cx+43},${cy-25} ${cx-43},${cy-25}`} />
        <circle cx={cx} cy={cy} r={50} strokeDasharray="1 1" />
      </g>

      {/* Radial lines from center */}
      {[0, 60, 120, 180, 240, 300].map((a) => {
        const θ = a * Math.PI / 180;
        return (
          <line key={a}
            x1={cx} y1={cy}
            x2={cx + Math.cos(θ) * 50} y2={cy + Math.sin(θ) * 50}
            stroke="#f5d76e" strokeWidth={0.2} opacity={0.4}
          />
        );
      })}
    </svg>
  );
}
