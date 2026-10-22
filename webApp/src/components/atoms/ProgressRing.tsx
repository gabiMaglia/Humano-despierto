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
        fill="none" stroke="var(--salvia)" strokeWidth={3}
      />
      <circle
        cx={half} cy={half} r={r}
        fill="none" stroke="var(--miel)" strokeWidth={3}
        strokeDasharray={c} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${half} ${half})`}
      />
      <text
        x={half} y={half}
        textAnchor="middle" dominantBaseline="middle"
        fill="var(--bosque)" fontSize={fontSize} fontWeight={600}
        fontFamily="var(--font-jakarta), system-ui, sans-serif"
      >
        {value}
        <tspan fontSize={supSize} dy={-2}>%</tspan>
      </text>
    </svg>
  );
}
