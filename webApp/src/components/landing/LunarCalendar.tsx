import type { LunarDay, LunarPhaseName as Phase } from "@/lib/lunar";

const MESES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
const LABELS = ["sembrar", "iniciar", "crecer", "culminar", "liberar", "integrar", "soltar", "descansar"];

// Etiqueta de la fecha: el primer dia y los cambios de mes llevan mes, el resto solo numero.
function dateLabel(d: LunarDay, prev: LunarDay | undefined) {
  const day = d.date.getUTCDate();
  const month = MESES[d.date.getUTCMonth()];
  return !prev || prev.date.getUTCMonth() !== d.date.getUTCMonth() ? `${day} ${month}` : String(day);
}

function Moon({ phase, today }: { phase: Phase; today?: boolean }) {
  const base: React.CSSProperties = {
    width: 48, height: 48, borderRadius: "50%",
    position: "relative", overflow: "hidden",
  };

  if (phase === "new") return (
    <div style={{ ...base, background: "var(--papel)", border: "1px dashed var(--musgo)" }} />
  );
  if (phase === "full") return (
    <div style={{
      ...base,
      background: "var(--miel)",
      border: "1px solid var(--miel-800)",
      boxShadow: today ? "0 0 0 4px var(--miel-100)" : undefined,
    }} />
  );
  if (phase === "half") return (
    <div style={{ ...base, background: "linear-gradient(90deg, var(--papel) 50%, var(--musgo) 50%)", border: "1px solid var(--musgo)" }} />
  );

  const shift = phase === "crescent" ? "-30%" : "-70%";
  return (
    <div style={{ ...base, background: "var(--musgo)", border: "1px solid var(--musgo)" }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "var(--papel)", transform: `translateX(${shift})` }} />
    </div>
  );
}

export default function LunarCalendar({ days }: { days: LunarDay[] }) {
  return (
    <section
      className="border-b border-t border-linea bg-salvia-100 px-6 py-24 md:px-12"
    >
      <div className="mx-auto max-w-7xl">

        {/* Eyebrow */}
        <div className="mb-3.5 flex items-center gap-3.5">
          <div className="h-px flex-1 bg-salvia" />
          <span className="font-display text-eyebrow tracking-[0.25em] text-bosque">Calendario lunar</span>
          <div className="h-px flex-1 bg-salvia" />
        </div>

        <h2 className="mb-4 text-center font-display text-4xl tracking-wider text-tinta">
          El cielo <em className="font-quote italic text-miel-800">marca el ritmo</em>
        </h2>
        <p className="mx-auto mb-14 max-w-[560px] text-center font-quote italic text-xl leading-relaxed text-suave">
          Un mapa del cielo para acompañar la práctica, no un calendario de clases.
        </p>

        {/* Moon phases */}
        <div className="flex flex-wrap justify-around gap-6">
          {days.map((d, i) => (
            <div key={d.date.toISOString()} className="relative flex flex-col items-center gap-3 text-center cursor-pointer transition-transform hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
              <Moon phase={d.phase} today={d.today} />
              <span className="font-display text-[11px] tracking-[0.2em] text-tinta">{dateLabel(d, days[i - 1])}</span>
              <span className="font-quote italic text-sm text-suave">{LABELS[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
