import { LUNAR_DAYS } from "@/lib/mocks/landing";

type Phase = (typeof LUNAR_DAYS)[number]["phase"];

function Moon({ phase, today }: { phase: Phase; today?: boolean }) {
  const base: React.CSSProperties = {
    width: 48, height: 48, borderRadius: "50%",
    position: "relative", overflow: "hidden",
  };

  if (phase === "new") return (
    <div style={{ ...base, background: "#140828", border: "1px dashed rgba(196,181,253,0.4)" }} />
  );
  if (phase === "full") return (
    <div style={{
      ...base,
      background: "radial-gradient(circle at 35% 35%, #fde68a, #d4a843)",
      border: "1px solid #f5d76e",
      boxShadow: today ? "0 0 30px #f5d76e" : "0 0 20px rgba(245,215,110,0.5)",
    }} />
  );
  if (phase === "half") return (
    <div style={{ ...base, background: "linear-gradient(90deg, #1f0f3a 50%, #b8a8d0 50%)", border: "1px solid rgba(196,181,253,0.4)" }} />
  );

  const shift = phase === "crescent" ? "-30%" : "-70%";
  return (
    <div style={{ ...base, background: "#b8a8d0", border: "1px solid rgba(196,181,253,0.4)" }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#140828", transform: `translateX(${shift})` }} />
    </div>
  );
}

export default function LunarCalendar() {
  return (
    <section
      className="border-b border-t border-lila-300/18 px-6 py-24 md:px-12"
      style={{ background: "linear-gradient(180deg, #1a0e2e 0%, #140828 100%)" }}
    >
      <div className="mx-auto max-w-7xl">

        {/* Eyebrow */}
        <div className="mb-3.5 flex items-center gap-3.5">
          <div className="h-px flex-1 bg-lila-300/18" />
          <span className="font-display text-eyebrow tracking-[0.25em] text-lila-300">Calendario lunar</span>
          <div className="h-px flex-1 bg-lila-300/18" />
        </div>

        <h2 className="mb-4 text-center font-display text-4xl tracking-wider text-ink">
          El cielo <em className="font-quote italic text-lila-300">marca el ritmo</em>
        </h2>
        <p className="mx-auto mb-14 max-w-[560px] text-center font-quote italic text-xl leading-relaxed text-ink-soft">
          Los lives, rituales y cohortes se sincronizan con las fases de la luna.
        </p>

        {/* Moon phases */}
        <div className="flex flex-wrap justify-around gap-6">
          {LUNAR_DAYS.map((d) => (
            <div key={d.date} className="relative flex flex-col items-center gap-3 text-center cursor-pointer transition-transform hover:-translate-y-1">
              <Moon phase={d.phase} today={"today" in d && d.today} />
              <span className="font-display text-[11px] tracking-[0.2em] text-ink">{d.date}</span>
              <span className="font-quote italic text-sm text-ink-soft">{d.label}</span>
              {"event" in d && d.event && (
                <span className="absolute -bottom-6 font-display text-[10px] tracking-[0.1em] text-gold-400">
                  {d.event}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
