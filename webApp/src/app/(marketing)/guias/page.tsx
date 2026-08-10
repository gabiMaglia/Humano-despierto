import GuiaCard from "@/components/molecules/GuiaCard";
import PageHeader from "@/components/layout/PageHeader";
import { getPublicTeachers } from "@/lib/server/guias";

export default async function GuiasPage() {
  const guias = await getPublicTeachers();
  const disciplinas = [...new Set(guias.map((g) => g.discipline).filter((d): d is string => !!d))];

  return (
    <div className="min-h-screen bg-cosmos-0">

      <PageHeader
        badge={`${guias.length} guías · ${disciplinas.length} disciplinas`}
        title={<>Quienes <em className="font-quote italic text-lila-300">sostienen</em> el camino</>}
        subtitle="Cada guía llegó al oficio por una grieta distinta. Todos comparten una misma convicción: el conocimiento no se transmite, se despierta."
      />

      {/* Body */}
      <div className="mx-auto max-w-7xl px-6 py-10 md:px-12">

        {/* Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {guias.map((guia) => (
            <GuiaCard key={guia.slug} {...guia} />
          ))}
        </div>

        {guias.length === 0 && (
          <p className="py-16 text-center font-body text-sm text-ink-soft">
            Todavía no hay guías con cursos publicados.
          </p>
        )}

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
