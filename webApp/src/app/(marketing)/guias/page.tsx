import GuiaCard from "@/components/molecules/GuiaCard";
import PageHeader from "@/components/layout/PageHeader";
import { GUIAS } from "@/lib/mocks/guia";

const DISCIPLINES = [
  { label: "Todas",       value: "all",        count: 5  },
  { label: "Tarot",       value: "tarot",       count: 1  },
  { label: "Astrología",  value: "astrologia",  count: 2  },
  { label: "Herbalismo",  value: "herbalismo",  count: 1  },
  { label: "Reiki",       value: "reiki",       count: 1  },
];

export default function GuiasPage() {
  return (
    <div className="min-h-screen bg-cosmos-0">

      <PageHeader
        badge="V guías · 4 disciplinas"
        title={<>Quienes <em className="font-quote italic text-lila-300">sostienen</em> el camino</>}
        subtitle="Cada guía llegó al oficio por una grieta distinta. Todos comparten una misma convicción: el conocimiento no se transmite, se despierta."
      />

      {/* Body */}
      <div className="mx-auto max-w-7xl px-6 py-10 md:px-12">

        {/* Discipline tabs */}
        <div className="mb-8 flex flex-wrap gap-2">
          {DISCIPLINES.map(({ label, count }, i) => (
            <button
              key={label}
              className={`inline-flex items-center gap-2 rounded-pill border px-4 py-1.5 font-display text-eyebrow tracking-[0.15em] transition-colors ${
                i === 0
                  ? "border-lila-300/60 bg-lila-300/10 text-lila-300"
                  : "border-lila-300/20 text-ink-faint hover:border-lila-300/40 hover:text-ink-soft"
              }`}
            >
              {label}
              <span className="font-display text-[9px] text-current opacity-60">{count}</span>
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {GUIAS.map((guia) => (
            <GuiaCard key={guia.slug} {...guia} />
          ))}
        </div>

        {/* Bottom note */}
        <p className="mt-16 text-center font-display text-eyebrow tracking-[0.2em] text-ink-faint">
          — ¿Querés ser guía? ·{" "}
          <a href="#" className="text-lila-300 hover:text-lila-200 transition-colors">Escribinos</a>
          {" "} —
        </p>
      </div>
    </div>
  );
}
