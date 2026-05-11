interface Props {
  value: number;
  size?: number;
}

export default function ProgressRing({ value, size = 72 }: Props) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  const half = size / 2;
  const fontSize = size < 56 ? 10 : 14;
  const supSize = size < 56 ? 7 : 9;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-label={`${value}%`}>
      <circle
        cx={half} cy={half} r={r}
        fill="none" stroke="rgba(196,181,253,0.25)" strokeWidth={2}
      />
      <circle
        cx={half} cy={half} r={r}
        fill="none" stroke="#f5d76e" strokeWidth={2}
        strokeDasharray={c} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${half} ${half})`}
      />
      <text
        x={half} y={half}
        textAnchor="middle" dominantBaseline="middle"
        fill="#ede4ff" fontSize={fontSize}
        fontFamily="Cinzel, serif" letterSpacing="0.5"
      >
        {value}
        <tspan fontSize={supSize} dy={-2}>%</tspan>
      </text>
    </svg>
  );
}
