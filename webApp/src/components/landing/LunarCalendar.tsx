import Reveal from "@/components/layout/Reveal";
import { phaseLabel, type LunarDay, type LunarPhaseName } from "@/lib/lunar";

const LIT: Record<LunarPhaseName, number> = { new: 0, crescent: 0.25, half: 0.5, gibbous: 0.75, full: 1 };

const fecha = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", timeZone: "UTC" });

/** Fase en línea (ADR-015: SVG, no glifos). La parte iluminada es un semicírculo más el arco del
 *  terminador, una elipse de ancho |1 - 2k| con k = fracción iluminada. */
function Moon({ phase, waxing }: { phase: LunarPhaseName; waxing: boolean }) {
  const k = LIT[phase];
  const rx = Math.abs(1 - 2 * k) * 20;
  // Creciente: iluminado a la derecha; menguante, a la izquierda. El terminador se curva hacia el
  // lado iluminado mientras k < 1/2 y hacia el oscuro después.
  const outer = waxing ? 1 : 0;
  const inner = (k < 0.5) === waxing ? 0 : 1;
  return (
    <svg viewBox="0 0 48 48" className="h-12 w-12" aria-hidden="true" focusable="false">
      {k === 1 ? (
        <circle cx={24} cy={24} r={20} className="fill-miel" />
      ) : k > 0 ? (
        <path d={`M24 4A20 20 0 0 ${outer} 24 44A${rx} 20 0 0 ${inner} 24 4Z`} className="fill-miel" />
      ) : null}
      <circle cx={24} cy={24} r={20} fill="none" strokeWidth={1.5} className="stroke-musgo" />
    </svg>
  );
}

/** Calendario lunar de la portada (T-053), en lenguaje Brote. Es un mapa del cielo para la práctica,
 *  no un calendario de clases: los cursos no tienen fechas (ADR-004). */
export default function LunarCalendar({ days }: { days: LunarDay[] }) {
  return (
    <section aria-labelledby="luna-titulo" className="pb-[100px] md:pb-[120px]">
      <div className="mx-auto max-w-[1200px] px-6">
        <Reveal className="rounded-[24px] border border-linea bg-papel px-6 py-12 md:px-12">
          <h2 id="luna-titulo" className="mb-3 text-[clamp(26px,3vw,36px)]">Calendario lunar</h2>
          <p className="mb-10 max-w-[52ch] text-suave">
            Las próximas fases de la luna, para acompañar la práctica. No son fechas de clase: cada curso se ve
            cuando quieras.
          </p>
          <ol className="grid grid-cols-4 gap-x-4 gap-y-8 md:grid-cols-8">
            {days.map((d) => (
              <li key={d.date.toISOString()} className="flex flex-col items-center gap-2 text-center">
                <Moon phase={d.phase} waxing={d.waxing} />
                <span className="text-sm font-semibold text-bosque">
                  {d.today ? "Hoy" : fecha.format(d.date).replace(".", "")}
                </span>
                <span className="text-[13px] leading-tight text-suave">{phaseLabel(d.phase, d.waxing)}</span>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}
