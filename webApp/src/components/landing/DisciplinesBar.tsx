import Link from "next/link";
import type { DisciplineCount } from "@/lib/landing";

// Ilustración de línea: musgo es el color de ícono (ADR-015), nunca de texto.
function DisciplineIcon({ label }: { label: string }) {
  const stroke = "var(--musgo)";
  const cls    = "h-10 w-10 flex-none fill-none";

  if (label === "Astrología") return (
    <svg className={cls} viewBox="0 0 40 40" strokeWidth={1.5} style={{ stroke }} aria-hidden>
      <circle cx={20} cy={20} r={14} />
      <circle cx={20} cy={20} r={9} strokeDasharray="1 1" />
      <line x1={20} y1={6} x2={20} y2={34} />
      <line x1={6} y1={20} x2={34} y2={20} />
      <circle cx={20} cy={20} r={3} fill={stroke} />
    </svg>
  );
  if (label === "Tarot") return (
    <svg className={cls} viewBox="0 0 40 40" strokeWidth={1.5} style={{ stroke }} aria-hidden>
      <rect x={10} y={6} width={20} height={28} rx={2} />
      <rect x={13} y={9} width={14} height={22} rx={1} strokeDasharray="1 1" />
      <circle cx={20} cy={20} r={3} />
      <path d="M20 14 L20 26 M14 20 L26 20" />
    </svg>
  );
  if (label === "Reiki") return (
    <svg className={cls} viewBox="0 0 40 40" strokeWidth={1.5} style={{ stroke }} aria-hidden>
      <path d="M14 30 L14 18 Q14 14 20 14 Q26 14 26 18 L26 30" />
      <circle cx={20} cy={10} r={3} />
      <path d="M10 26 Q14 22 18 26 M22 26 Q26 22 30 26" />
    </svg>
  );
  if (label !== "Herbalismo" && label !== "Herbal") return (
    <svg className={cls} viewBox="0 0 40 40" strokeWidth={1.5} style={{ stroke }} aria-hidden>
      <circle cx={20} cy={20} r={12} />
      <circle cx={20} cy={20} r={4} />
    </svg>
  );
  return (
    <svg className={cls} viewBox="0 0 40 40" strokeWidth={1.5} style={{ stroke }} aria-hidden>
      <path d="M20 34 L20 12" />
      <path d="M20 22 Q12 18 10 10 Q18 12 20 20" />
      <path d="M20 26 Q28 22 30 14 Q22 16 20 24" />
      <path d="M20 16 Q14 14 14 8 Q18 10 20 14" />
    </svg>
  );
}

export default function DisciplinesBar({ disciplines }: { disciplines: DisciplineCount[] }) {
  if (disciplines.length === 0) return null;
  return (
    <div
      className="grid grid-cols-2 border-b border-t border-linea bg-salvia-100 md:grid-cols-4"
      style={{ gap: "1px" }}
    >
      {disciplines.map((d) => (
        <Link
          key={d.key}
          href={`/cursos?disciplina=${encodeURIComponent(d.key)}`}
          className="flex items-center gap-3.5 bg-papel px-6 py-7 transition-colors hover:bg-salvia-100 md:px-8 md:py-8"
        >
          <DisciplineIcon label={d.label} />
          <div>
            <div className="mb-1 font-display text-[11px] uppercase tracking-[0.2em] text-tinta">
              {d.label}
            </div>
            <div className="font-body text-xs leading-snug text-suave">
              {d.count} {d.count === 1 ? "curso" : "cursos"}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
