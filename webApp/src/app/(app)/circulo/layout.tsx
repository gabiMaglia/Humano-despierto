import Nav from "@/components/layout/Nav";
import CampusSidebar from "@/components/campus/CampusSidebar";
import { getCampusSidebar } from "@/lib/server/campus";

// T-021 · Campus. El grupo de ruta `(app)` ya exige sesión (`(app)/layout.tsx` redirige a
// `/entrar`) — acá no hay guard propio, sería el mismo control por triplicado.
//
// El mock viejo (`COM.stats`) mostraba "CDXVIII estudiantes · XXIV círculos activos": números
// inventados sin tabla detrás. Se sacan enteros, mismo criterio que T-007 aplicó al panel del
// alumno ("un widget decorativo sin tabla real es peor que no mostrarlo"). El "código del
// círculo" de abajo SÍ queda: es copy editorial fijo, no un dato que finge estar en vivo.
const PACT = [
  "Hablamos desde la experiencia, no desde la verdad.",
  "No diagnosticamos. Sugerimos, acompañamos.",
  "Lo que se comparte aquí, queda aquí.",
  "Cuidamos el silencio de quien todavía no se anima.",
];

export default async function CampusLayout({ children }: { children: React.ReactNode }) {
  const threads = await getCampusSidebar();

  return (
    <div className="min-h-screen bg-cosmos-0 text-ink">
      <Nav />
      <div className="pt-16">
        <header className="border-b border-lila-300/18 bg-cosmos-surface px-6 py-10 md:px-12">
          <p className="mb-2 font-display text-eyebrow tracking-[0.25em] text-ink-faint">— Campus —</p>
          <h1 className="mb-2 font-display text-display-md text-ink">
            Las que ya están <em className="font-quote italic text-lila-300">adentro</em>
          </h1>
          <p className="max-w-xl font-quote italic text-ink-soft">
            Un hilo por curso, y un hilo general. Sin métricas, sin algoritmo.
          </p>
        </header>

        <div className="mx-auto grid max-w-6xl gap-0 lg:grid-cols-[240px_1fr_260px]">
          <aside className="hidden lg:block border-r border-lila-300/18 p-5">
            <p className="mb-4 font-display text-eyebrow tracking-cosmic text-ink-faint uppercase">Hilos</p>
            <CampusSidebar threads={threads} />
          </aside>

          <main className="min-w-0 border-r border-lila-300/18">{children}</main>

          <aside className="hidden lg:block p-5">
            <p className="mb-3 font-display text-eyebrow tracking-cosmic text-ink-faint uppercase">Código del círculo</p>
            <ul className="space-y-2">
              {PACT.map((p, i) => (
                <li key={p} className="flex items-start gap-2">
                  <span className="flex-none font-display text-eyebrow text-lila-300 w-4">
                    {["I", "II", "III", "IV"][i]}
                  </span>
                  <span className="font-body text-[11px] text-ink-faint leading-relaxed">{p}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}
