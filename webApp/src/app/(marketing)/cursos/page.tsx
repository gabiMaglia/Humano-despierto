import type { Metadata } from "next";
import Icon from "@/components/atoms/Icon";
import Link from "next/link";
import CourseCard from "@/components/molecules/CourseCard";
import PageHeader from "@/components/layout/PageHeader";
import { getPublishedCourses, signCatalogCovers } from "@/lib/server/courses";
import { getWishlistIds } from "@/lib/server/wishlist";
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
  sortCourses,
  withParam,
  type CatalogOrder,
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
      <h4 className="mb-3 font-display text-eyebrow uppercase tracking-[0.2em] text-tinta">{title}</h4>
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
                item.active ? "border-linea bg-salvia-100 text-miel-800" : "border-linea text-transparent"
              }`}
            >
              {item.active && <Icon name="check" className="h-3 w-3" />}
            </span>
            <span className={`font-body text-sm flex-1 ${item.active ? "text-tinta" : "text-suave"}`}>
              {item.label}
            </span>
            <span className="font-display text-[9px] text-suave">{item.count}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}


const ORDER_OPTIONS: { key: CatalogOrder; label: string }[] = [
  { key: "relevancia", label: "Relevancia" },
  { key: "mejor-valorado", label: "Mejor valorado" },
  { key: "mas-nuevo", label: "Más nuevo" },
];

export const metadata: Metadata = {
  title: "Cursos",
  description: "Tarot, astrología, herbalismo, reiki y magia. Cursos on-demand con guías de linaje.",
};

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const sp = await searchParams;
  const current = toURLSearchParams(sp);
  const state = parseCatalogFilterState(sp);

  const rawCourses = await getPublishedCourses();
  const allCourses = annotateCourses(rawCourses);

  const disciplineFacets = buildDisciplineFacets(allCourses, state);
  const levelFacets = buildLevelFacets(allCourses, state);
  const durationFacets = buildDurationFacets(allCourses, state);

  const filtered = sortCourses(filterCourses(allCourses, state), state.order);
  const { items: pageCourses, page, totalPages } = paginate(filtered, state.page, PAGE_SIZE);
  // Solo la pagina visible: firmar el catalogo entero seria una URL por curso que nadie ve.
  const covers = await signCatalogCovers(pageCourses);
  // T-033 · una consulta para todas las cards. Sin sesión el botón lleva al login y vuelve acá,
  // con los filtros puestos.
  const savedIds = await getWishlistIds();
  const loginHref = savedIds ? null : `/entrar?next=${encodeURIComponent(hrefFor(current))}`;

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
    <div className="min-h-screen bg-fondo">
      <PageHeader
        badge={`${allCourses.length} curso${allCourses.length === 1 ? "" : "s"} · ${disciplineFacets.length} disciplina${disciplineFacets.length === 1 ? "" : "s"}`}
        title={<>El compendio <em className="font-quote italic text-miel-800">vivo</em></>}
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
            {state.order !== "relevancia" && <input type="hidden" name="orden" value={state.order} />}
            {state.levels.length > 0 && <input type="hidden" name="nivel" value={state.levels.join(",")} />}
            {state.durations.length > 0 && (
              <input type="hidden" name="duracion" value={state.durations.join(",")} />
            )}
            <div className="flex items-center gap-2.5 rounded-md border border-linea bg-papel px-3.5 py-2.5">
              <input
                type="text"
                name="q"
                defaultValue={state.query}
                placeholder="Buscar en el compendio…"
                className="flex-1 bg-transparent font-body text-sm text-tinta placeholder:text-suave outline-none"
              />
            </div>
          </form>
          <FilterGroup title="Disciplina" param="disciplina" items={disciplineFacets} current={current} />
          <FilterGroup title="Nivel" param="nivel" items={levelFacets} current={current} />
          <FilterGroup title="Duración" param="duracion" items={durationFacets} current={current} />
          {hasAnyFilter && (
            <Link
              href="/cursos"
              className="mt-2 inline-block font-display text-eyebrow tracking-wide text-suave hover:text-bosque transition-colors"
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
              <span className="font-display text-2xl text-tinta">{filtered.length}</span>
              <span className="ml-2 font-body text-sm text-suave">
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
                    className="inline-flex items-center gap-1.5 rounded-pill bg-salvia-100 border border-linea px-3 py-1 font-display text-eyebrow text-bosque"
                  >
                    {chip.label} <span className="text-miel-800 hover:text-miel-800">✕</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <nav aria-label="Ordenar cursos" className="mb-6 flex flex-wrap items-center gap-2">
            <span className="font-display text-eyebrow uppercase tracking-[0.2em] text-suave">Ordenar</span>
            {ORDER_OPTIONS.map((o) => (
              <Link
                key={o.key}
                href={hrefFor(withParam(current, "orden", o.key))}
                aria-pressed={state.order === o.key}
                className={`rounded-pill border px-3 py-1 font-display text-eyebrow ${
                  state.order === o.key
                    ? "border-linea bg-salvia-100 text-miel-800"
                    : "border-linea text-suave hover:text-suave"
                }`}
              >
                {o.label}
              </Link>
            ))}
          </nav>

          {filtered.length === 0 ? (
            <div className="tarjeta flex flex-col items-center gap-4 px-6 py-20 text-center">
              <p className="font-body text-sm text-suave max-w-sm">
                Ningún curso del compendio coincide con estos filtros. Probá con otra combinación o
                empezá de nuevo.
              </p>
              <Link href="/cursos" className="btn btn-outline">
                Limpiar filtros ✕
              </Link>
            </div>
          ) : (
            <>
              {/* Grid */}
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {pageCourses.map((course, i) => (
                  <CourseCard
                    key={course.slug}
                    eager={i < 3}
                    tag={course.discipline}
                    level={course.level}
                    title={course.title}
                    titleEm={course.titleEm ?? undefined}
                    desc={course.desc ?? ""}
                    teacher={course.teacherName}
                    price={formatPriceCents(course.priceCents, course.currency)}
                    featured={course.featured}
                    slug={course.slug}
                    rating={course.rating}
                    reviewCount={course.reviewCount}
                    coverUrl={course.coverPath ? covers.get(course.coverPath) : undefined}
                    wishlist={{ courseId: course.id, saved: savedIds?.has(course.id) ?? false, loginHref }}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-12 flex items-center justify-center gap-2">
                  <Link
                    href={hrefFor(withPage(current, page - 1))}
                    aria-disabled={page <= 1}
                    className={`h-9 min-w-9 px-3 rounded-md font-display text-[11px] tracking-wide transition-colors flex items-center justify-center border ${
                      page <= 1
                        ? "pointer-events-none border-linea text-suave"
                        : "border-linea text-suave hover:border-linea hover:text-suave"
                    }`}
                  >
                    ←
                  </Link>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <Link
                      key={p}
                      href={hrefFor(withPage(current, p))}
                      className={`h-9 min-w-9 px-3 rounded-md font-display text-[11px] tracking-wide transition-colors flex items-center justify-center border ${
                        p === page
                          ? "bg-salvia-100 border-linea text-miel-800"
                          : "border-linea text-suave hover:border-linea hover:text-suave"
                      }`}
                    >
                      {p}
                    </Link>
                  ))}
                  <Link
                    href={hrefFor(withPage(current, page + 1))}
                    aria-disabled={page >= totalPages}
                    className={`h-9 min-w-9 px-3 rounded-md font-display text-[11px] tracking-wide transition-colors flex items-center justify-center border ${
                      page >= totalPages
                        ? "pointer-events-none border-linea text-suave"
                        : "border-linea text-suave hover:border-linea hover:text-suave"
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
