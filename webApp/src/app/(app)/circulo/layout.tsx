import SiteHeader from "@/components/layout/SiteHeader";
import AppPageHeader from "@/components/layout/AppPageHeader";
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
    <div className="min-h-screen bg-fondo text-tinta">
      <SiteHeader />
      <AppPageHeader
        eyebrow="Campus"
        title="Las que ya están adentro"
        subtitle="Un hilo por curso, y un hilo general. Sin métricas, sin algoritmo."
      >
        <div className="lg:hidden">
          <CampusSidebar threads={threads} variant="chips" />
        </div>
      </AppPageHeader>

      <div className="mx-auto grid max-w-[1200px] items-start gap-8 px-6 py-10 lg:grid-cols-[260px_minmax(0,1fr)_260px]">
        <aside aria-labelledby="hilos" className="tarjeta hidden p-4 lg:block">
          <h2 id="hilos" className="mb-3 px-3 text-base">
            Hilos
          </h2>
          <CampusSidebar threads={threads} />
        </aside>

        <main className="tarjeta min-w-0 overflow-hidden">{children}</main>

        <aside aria-labelledby="codigo" className="rounded-lg bg-salvia-100 p-6">
          <h2 id="codigo" className="mb-4 text-base">
            Código del círculo
          </h2>
          <ol className="space-y-3">
            {PACT.map((p, i) => (
              <li key={p} className="grid grid-cols-[28px_1fr] items-start gap-3 text-sm leading-relaxed text-tinta">
                <span
                  aria-hidden="true"
                  className="grid h-7 w-7 place-items-center rounded-full bg-papel text-xs font-bold text-bosque"
                >
                  {i + 1}
                </span>
                {p}
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
