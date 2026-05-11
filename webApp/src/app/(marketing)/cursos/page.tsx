import CourseCard from "@/components/molecules/CourseCard";
import SectionHeader from "@/components/atoms/SectionHeader";
import { CATALOG_COURSES } from "@/lib/mocks/courses";

const FILTERS = {
  disciplina: [
    { label:"Astrología", count:14, active:true  },
    { label:"Tarot",      count:12, active:true  },
    { label:"Reiki",      count:9,  active:false },
    { label:"Herbalismo", count:13, active:false },
  ],
  nivel: [
    { label:"Inicial",    count:18, active:true  },
    { label:"Intermedio", count:22, active:true  },
    { label:"Maestría",   count:8,  active:false },
  ],
  formato: [
    { label:"Live + grabado", count:20, active:true  },
    { label:"Solo grabado",   count:22, active:false },
    { label:"Presencial",     count:6,  active:false },
  ],
  cohorte: [
    { label:"☾ Luna nueva · 6 may",    count:12, active:true  },
    { label:"◐ Creciente · 14 may",    count:8,  active:false },
    { label:"● Llena · 22 may",         count:6,  active:false },
  ],
};

function FilterGroup({ title, items }: { title: string; items: { label: string; count: number; active: boolean }[] }) {
  return (
    <div className="mb-6">
      <h4 className="mb-3 font-display text-eyebrow uppercase tracking-[0.2em] text-ink">{title}</h4>
      <div className="space-y-2">
        {items.map((item) => (
          <label key={item.label} className="flex cursor-pointer items-center gap-2.5 group">
            <span className={`h-4 w-4 flex-none rounded-sm border flex items-center justify-center text-[8px] transition-colors ${item.active ? "border-lila-300 bg-lila-300/20 text-lila-300" : "border-lila-300/30 text-transparent"}`}>
              {item.active && "✦"}
            </span>
            <span className={`font-body text-sm flex-1 ${item.active ? "text-ink" : "text-ink-soft"}`}>{item.label}</span>
            <span className="font-display text-[9px] text-ink-faint">{item.count}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function CatalogPage() {
  return (
    <div className="min-h-screen bg-cosmos-0">
      {/* Hero strip */}
      <header className="relative border-b border-lila-300/18 bg-cosmos-surface px-6 py-16 md:px-12 overflow-hidden">
        <svg className="absolute right-8 top-1/2 -translate-y-1/2 h-24 w-48 opacity-30" viewBox="0 0 200 80" aria-hidden>
          <g stroke="#c4b5fd" fill="none" strokeWidth="0.4">
            <circle cx={100} cy={40} r={30} /><circle cx={100} cy={40} r={22} strokeDasharray="1 2" />
            <line x1={70} y1={40} x2={130} y2={40} /><line x1={100} y1={10} x2={100} y2={70} />
            <polygon points="100,15 125,55 75,55" /><polygon points="100,65 125,25 75,25" />
          </g>
        </svg>
        <div className="relative max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-pill border border-lila-300/40 px-3.5 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-400" style={{ boxShadow:"0 0 8px #f5d76e" }} />
            <span className="font-display text-[9px] uppercase tracking-[0.22em] text-lila-300">48 cursos · 4 disciplinas</span>
          </div>
          <h1 className="font-display text-display-md text-ink mb-3">
            El compendio <em className="font-quote italic text-lila-300">vivo</em>
          </h1>
          <p className="font-quote italic text-lg text-ink-soft max-w-md">
            Cada cohorte abre con la luna nueva. Los cursos a tu propio ritmo siempre están disponibles.
          </p>
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto max-w-7xl px-6 py-10 md:px-12 flex gap-8">

        {/* Sidebar filters */}
        <aside className="hidden w-64 flex-none lg:block">
          {/* Search */}
          <div className="mb-6 flex items-center gap-2.5 rounded-ritual border border-lila-300/20 bg-cosmos-surface px-3.5 py-2.5">
            <span className="text-lila-300 text-sm">✦</span>
            <input
              type="text"
              placeholder="Buscar en el compendio…"
              className="flex-1 bg-transparent font-body text-sm text-ink placeholder:text-ink-faint outline-none"
            />
          </div>
          <FilterGroup title="Disciplina" items={FILTERS.disciplina} />
          <FilterGroup title="Nivel"      items={FILTERS.nivel} />
          <FilterGroup title="Formato"    items={FILTERS.formato} />
          <FilterGroup title="Próxima cohorte" items={FILTERS.cohorte} />
          <button className="mt-2 font-display text-eyebrow tracking-cosmic text-ink-faint hover:text-lila-300 transition-colors">
            Limpiar filtros ✕
          </button>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div>
              <span className="font-display text-2xl text-ink">28</span>
              <span className="ml-2 font-body text-sm text-ink-soft">cursos · 3 filtros activos</span>
            </div>
            <div className="flex-1 flex flex-wrap gap-2">
              {["Astrología", "Tarot", "Inicial + Intermedio"].map((chip) => (
                <span key={chip} className="inline-flex items-center gap-1.5 rounded-pill bg-lila-300/10 border border-lila-300/30 px-3 py-1 font-display text-eyebrow text-lila-300">
                  {chip} <span className="text-lila-400 hover:text-gold-400 cursor-pointer">✕</span>
                </span>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {CATALOG_COURSES.map((course) => (
              <CourseCard key={course.slug} {...course} />
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-12 flex items-center justify-center gap-2">
            {["←", "1", "2", "3", "···", "7", "→"].map((p, i) => (
              <button key={i} className={`h-9 min-w-9 px-3 rounded-ritual font-display text-[11px] tracking-wide transition-colors ${p === "1" ? "bg-lila-300/20 border border-lila-300/60 text-lila-300" : "border border-lila-300/20 text-ink-faint hover:border-lila-300/40 hover:text-ink-soft"}`}>
                {p}
              </button>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
