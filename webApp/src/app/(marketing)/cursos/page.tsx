import Link from "next/link";
import CourseCard from "@/components/molecules/CourseCard";
import PageHeader from "@/components/layout/PageHeader";
import { getPublishedCourses } from "@/lib/server/courses";
import { formatPriceCents } from "@/lib/utils/format";
import {
  PAGE_SIZE,
  annotateCourses,
  buildDisciplineFacets,
  buildDurationFacets,
  buildLevelFacets,
  filterCourses,
  hrefFor,
  paginate,
  parseCatalogFilterState,
  toggleListParam,
  toURLSearchParams,
  withoutParam,
  withPage,
  type FacetOption,
} from "./catalog-filters";

interface CatalogPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function FilterGroup({
  title,
  param,
  items,
  current,
}: {
  title: string;
  param: string;
  items: FacetOption[];
  current: URLSearchParams;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-6">
      <h4 className="mb-3 font-display text-eyebrow uppercase tracking-[0.2em] text-ink">{title}</h4>
      <div className="space-y-2">
        {items.map((item) => (
          <Link
            key={item.key}
            href={hrefFor(toggleListParam(current, param, item.key))}
            aria-pressed={item.active}
            className="flex items-center gap-2.5 group"
          >
            <span
              className={`h-4 w-4 flex-none rounded-sm border flex items-center justify-center text-[8px] transition-colors ${
                item.active ? "border-lila-300 bg-lila-300/20 text-lila-300" : "border-lila-300/30 text-transparent"
              }`}
            >
              {item.active && "✦"}
            </span>
            <span className={`font-body text-sm flex-1 ${item.active ? "text-ink" : "text-ink-soft"}`}>
              {item.label}
            </span>
            <span className="font-display text-[9px] text-ink-faint">{item.count}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const sp = await searchParams;
  const current = toURLSearchParams(sp);
  const state = parseCatalogFilterState(sp);

  const rawCourses = await getPublishedCourses();
  const allCourses = annotateCourses(rawCourses);

  const disciplineFacets = buildDisciplineFacets(allCourses, state);
  const levelFacets = buildLevelFacets(allCourses, state);
  const durationFacets = buildDurationFacets(allCourses, state);

  const filtered = filterCourses(allCourses, state);
  const { items: pageCourses, page, totalPages } = paginate(filtered, state.page, PAGE_SIZE);

  const activeChips: { label: string; href: string }[] = [
    ...disciplineFacets
      .filter((f) => f.active)
      .map((f) => ({ label: f.label, href: hrefFor(toggleListParam(current, "disciplina", f.key)) })),
    ...levelFacets
      .filter((f) => f.active)
      .map((f) => ({ label: f.label, href: hrefFor(toggleListParam(current, "nivel", f.key)) })),
    ...durationFacets
      .filter((f) => f.active)
      .map((f) => ({ label: f.label, href: hrefFor(toggleListParam(current, "duracion", f.key)) })),
    ...(state.query ? [{ label: `“${state.query}”`, href: hrefFor(withoutParam(current, "q")) }] : []),
  ];

  const activeFilterCount = activeChips.length;
  const hasAnyFilter = activeFilterCount > 0;

  return (
    <div className="min-h-screen bg-cosmos-0">
      <PageHeader
        badge={`${allCourses.length} curso${allCourses.length === 1 ? "" : "s"} · ${disciplineFacets.length} disciplina${disciplineFacets.length === 1 ? "" : "s"}`}
        title={<>El compendio <em className="font-quote italic text-lila-300">vivo</em></>}
        subtitle="Todos los recorridos están abiertos. Se cursan a tu propio ritmo, sin fecha de inicio."
      />

      {/* Body */}
      <div className="mx-auto max-w-7xl px-6 py-10 md:px-12 flex gap-8">

        {/* Sidebar filters */}
        <aside className="hidden w-64 flex-none lg:block">
          {/* Search — form GET nativo: sin JS, funciona con el botón atrás y es enlazable. */}
          <form action="/cursos" method="get" className="mb-6">
            {state.disciplines.length > 0 && (
              <input type="hidden" name="disciplina" value={state.disciplines.join(",")} />
            )}
            {state.levels.length > 0 && <input type="hidden" name="nivel" value={state.levels.join(",")} />}
            {state.durations.length > 0 && (
              <input type="hidden" name="duracion" value={state.durations.join(",")} />
            )}
            <div className="flex items-center gap-2.5 rounded-ritual border border-lila-300/20 bg-cosmos-surface px-3.5 py-2.5">
              <span className="text-lila-300 text-sm">✦</span>
              <input
                type="text"
                name="q"
                defaultValue={state.query}
                placeholder="Buscar en el compendio…"
                className="flex-1 bg-transparent font-body text-sm text-ink placeholder:text-ink-faint outline-none"
              />
            </div>
          </form>
          <FilterGroup title="Disciplina" param="disciplina" items={disciplineFacets} current={current} />
          <FilterGroup title="Nivel" param="nivel" items={levelFacets} current={current} />
          <FilterGroup title="Duración" param="duracion" items={durationFacets} current={current} />
          {hasAnyFilter && (
            <Link
              href="/cursos"
              className="mt-2 inline-block font-display text-eyebrow tracking-cosmic text-ink-faint hover:text-lila-300 transition-colors"
            >
              Limpiar filtros ✕
            </Link>
          )}
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div>
              <span className="font-display text-2xl text-ink">{filtered.length}</span>
              <span className="ml-2 font-body text-sm text-ink-soft">
                curso{filtered.length === 1 ? "" : "s"}
                {hasAnyFilter && ` · ${activeFilterCount} filtro${activeFilterCount === 1 ? "" : "s"} activo${activeFilterCount === 1 ? "" : "s"}`}
              </span>
            </div>
            {hasAnyFilter && (
              <div className="flex-1 flex flex-wrap gap-2">
                {activeChips.map((chip) => (
                  <Link
                    key={chip.label}
                    href={chip.href}
                    className="inline-flex items-center gap-1.5 rounded-pill bg-lila-300/10 border border-lila-300/30 px-3 py-1 font-display text-eyebrow text-lila-300"
                  >
                    {chip.label} <span className="text-lila-400 hover:text-gold-400">✕</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="cosmos-card flex flex-col items-center gap-4 px-6 py-20 text-center">
              <span className="font-display text-2xl text-lila-300">✧</span>
              <p className="font-body text-sm text-ink-soft max-w-sm">
                Ningún curso del compendio coincide con estos filtros. Probá con otra combinación o
                empezá de nuevo.
              </p>
              <Link href="/cursos" className="btn-ritual btn-ritual-ghost rounded-pill">
                Limpiar filtros ✕
              </Link>
            </div>
          ) : (
            <>
              {/* Grid */}
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {pageCourses.map((course) => (
                  <CourseCard
                    key={course.slug}
                    num={course.romanNum ?? ""}
                    tag={course.discipline}
                    level={course.level}
                    title={course.title}
                    titleEm={course.titleEm ?? undefined}
                    desc={course.desc ?? ""}
                    teacher={course.teacherName}
                    price={formatPriceCents(course.priceCents, course.currency)}
                    moon={course.moonGlyph ?? undefined}
                    featured={course.featured}
                    slug={course.slug}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-12 flex items-center justify-center gap-2">
                  <Link
                    href={hrefFor(withPage(current, page - 1))}
                    aria-disabled={page <= 1}
                    className={`h-9 min-w-9 px-3 rounded-ritual font-display text-[11px] tracking-wide transition-colors flex items-center justify-center border ${
                      page <= 1
                        ? "pointer-events-none border-lila-300/10 text-ink-faint/40"
                        : "border-lila-300/20 text-ink-faint hover:border-lila-300/40 hover:text-ink-soft"
                    }`}
                  >
                    ←
                  </Link>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <Link
                      key={p}
                      href={hrefFor(withPage(current, p))}
                      className={`h-9 min-w-9 px-3 rounded-ritual font-display text-[11px] tracking-wide transition-colors flex items-center justify-center border ${
                        p === page
                          ? "bg-lila-300/20 border-lila-300/60 text-lila-300"
                          : "border-lila-300/20 text-ink-faint hover:border-lila-300/40 hover:text-ink-soft"
                      }`}
                    >
                      {p}
                    </Link>
                  ))}
                  <Link
                    href={hrefFor(withPage(current, page + 1))}
                    aria-disabled={page >= totalPages}
                    className={`h-9 min-w-9 px-3 rounded-ritual font-display text-[11px] tracking-wide transition-colors flex items-center justify-center border ${
                      page >= totalPages
                        ? "pointer-events-none border-lila-300/10 text-ink-faint/40"
                        : "border-lila-300/20 text-ink-faint hover:border-lila-300/40 hover:text-ink-soft"
                    }`}
                  >
                    →
                  </Link>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
