import type { Metadata } from "next";
import Icon from "@/components/atoms/Icon";
import { ButtonLink } from "@/components/atoms/Button";
import Link from "next/link";
import CourseCard from "@/components/molecules/CourseCard";
import PageIntro from "@/components/layout/PageIntro";
import { cn } from "@/lib/utils/cn";
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

const chip = (active: boolean) =>
  cn(
    "inline-flex min-h-10 items-center gap-2 rounded-pill border-[1.5px] px-4 py-2 text-sm font-medium transition-colors",
    active ? "border-bosque bg-bosque text-white" : "border-salvia bg-papel text-bosque hover:border-bosque",
  );

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
    <fieldset className="mb-7">
      <legend className="mb-3 text-base font-semibold text-bosque">{title}</legend>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.key}>
            <Link
              href={hrefFor(toggleListParam(current, param, item.key))}
              aria-pressed={item.active}
              className="flex min-h-10 items-center gap-3 rounded-md px-1 text-[15px] text-tinta transition-colors hover:bg-salvia-100"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "grid h-5 w-5 flex-none place-items-center rounded-sm border-[1.5px]",
                  item.active ? "border-bosque bg-bosque text-white" : "border-salvia bg-papel",
                )}
              >
                {item.active && <Icon name="check" className="h-3.5 w-3.5" />}
              </span>
              <span className="flex-1">{item.label}</span>
              <span className="text-sm text-suave">{item.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

const ORDER_OPTIONS: { key: CatalogOrder; label: string }[] = [
  { key: "relevancia", label: "Relevancia" },
  { key: "mejor-valorado", label: "Mejor valorado" },
  { key: "mas-nuevo", label: "Más nuevo" },
];

export const metadata: Metadata = {
  title: "Cursos",
  description: "Tarot, astrología, herbolaria, reiki y magia. Cursos completos desde el primer día, con guías que practican lo que enseñan.",
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

  const filterGroups = (
    <>
      <FilterGroup title="Nivel" param="nivel" items={levelFacets} current={current} />
      <FilterGroup title="Duración" param="duracion" items={durationFacets} current={current} />
    </>
  );
  const pageLink = (target: number, label: string, icon: "arrow-left" | "arrow-right", disabled: boolean) => (
    <Link
      href={hrefFor(withPage(current, target))}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : undefined}
      className={cn(
        "grid h-11 w-11 place-items-center rounded-full border-[1.5px] border-salvia bg-papel text-bosque",
        disabled ? "pointer-events-none text-suave" : "hover:border-bosque",
      )}
    >
      <Icon name={icon} />
      <span className="sr-only">{label}</span>
    </Link>
  );

  return (
    <div className="min-h-screen bg-fondo">
      <PageIntro
        title="Cursos"
        lead={`${allCourses.length} curso${allCourses.length === 1 ? "" : "s"} de ${disciplineFacets.length} oficio${disciplineFacets.length === 1 ? "" : "s"}. Completos desde el primer día, sin fechas y sin vencimiento.`}
      >
        {/* Búsqueda: form GET nativo, sin JS, enlazable y compatible con el botón atrás. */}
        <form action="/cursos" method="get" role="search" className="max-w-xl">
          {state.disciplines.length > 0 && (
            <input type="hidden" name="disciplina" value={state.disciplines.join(",")} />
          )}
          {state.order !== "relevancia" && <input type="hidden" name="orden" value={state.order} />}
          {state.levels.length > 0 && <input type="hidden" name="nivel" value={state.levels.join(",")} />}
          {state.durations.length > 0 && <input type="hidden" name="duracion" value={state.durations.join(",")} />}
          <div className="flex items-center gap-2 rounded-pill border-[1.5px] border-linea bg-papel py-1 pl-5 pr-1 focus-within:border-musgo">
            <input
              type="search"
              name="q"
              defaultValue={state.query}
              aria-label="Buscar cursos"
              placeholder="Buscar por tema, por ejemplo «carta natal»"
              className="min-w-0 flex-1 bg-transparent py-2 text-[15px] text-tinta outline-none"
            />
            <button type="submit" className="grid h-10 w-10 flex-none cursor-pointer place-items-center rounded-full bg-bosque text-white">
              <Icon name="search" />
              <span className="sr-only">Buscar</span>
            </button>
          </div>
        </form>
      </PageIntro>

      <div className="mx-auto max-w-[1200px] px-6 pb-24">
        {disciplineFacets.length > 0 && (
          <ul aria-label="Filtrar por oficio" className="mb-6 flex flex-wrap gap-2">
            {disciplineFacets.map((f) => (
              <li key={f.key}>
                <Link href={hrefFor(toggleListParam(current, "disciplina", f.key))} aria-pressed={f.active} className={chip(f.active)}>
                  {f.label}
                  <span className={f.active ? "text-white" : "text-suave"}>{f.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* En móvil el resto de los filtros se pliega; en escritorio va en la columna lateral. */}
        <details className="mb-6 rounded-lg border border-linea bg-papel px-5 lg:hidden">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between font-semibold text-bosque [&::-webkit-details-marker]:hidden">
            Más filtros
            <Icon name="chevron-down" />
          </summary>
          <div className="pb-2 pt-3">{filterGroups}</div>
        </details>

        <div className="flex gap-10">
          <aside aria-label="Filtros" className="hidden w-56 flex-none lg:block">
            {filterGroups}
            {hasAnyFilter && (
              <Link href="/cursos" className="text-sm font-semibold text-miel-800 underline-offset-4 hover:underline">
                Limpiar filtros
              </Link>
            )}
          </aside>

          <main className="min-w-0 flex-1">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <p className="text-[15px] text-suave">
                <b className="text-xl font-semibold text-bosque">{filtered.length}</b>{" "}
                curso{filtered.length === 1 ? "" : "s"}
                {hasAnyFilter && ` · ${activeFilterCount} filtro${activeFilterCount === 1 ? "" : "s"} activo${activeFilterCount === 1 ? "" : "s"}`}
              </p>
              {hasAnyFilter && (
                <ul aria-label="Filtros activos" className="flex flex-1 flex-wrap gap-2">
                  {activeChips.map((c) => (
                    <li key={c.label}>
                      <Link
                        href={c.href}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-pill bg-salvia-100 px-3 py-1 text-sm font-medium text-bosque hover:bg-salvia"
                      >
                        {c.label}
                        <Icon name="close" className="h-3.5 w-3.5" />
                        <span className="sr-only">(quitar filtro)</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <nav aria-label="Ordenar cursos" className="mb-8 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-sm text-suave">Ordenar por</span>
              {ORDER_OPTIONS.map((o) => (
                <Link
                  key={o.key}
                  href={hrefFor(withParam(current, "orden", o.key))}
                  aria-pressed={state.order === o.key}
                  className={chip(state.order === o.key)}
                >
                  {o.label}
                </Link>
              ))}
            </nav>

            {filtered.length === 0 ? (
              <div className="tarjeta flex flex-col items-center gap-5 px-6 py-16 text-center">
                <p className="max-w-sm text-suave">
                  Ningún curso coincide con estos filtros. Probá con otra combinación o empezá de nuevo.
                </p>
                <ButtonLink href="/cursos" variant="outline">
                  Limpiar filtros
                </ButtonLink>
              </div>
            ) : (
              <>
                <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-3">
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
                      hasPreview={course.hasPreview}
                      coverUrl={course.coverPath ? covers.get(course.coverPath) : undefined}
                      wishlist={{ courseId: course.id, saved: savedIds?.has(course.id) ?? false, loginHref }}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <nav aria-label="Páginas del catálogo" className="mt-14 flex items-center justify-center gap-2">
                    {pageLink(page - 1, "Página anterior", "arrow-left", page <= 1)}
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <Link
                        key={p}
                        href={hrefFor(withPage(current, p))}
                        aria-current={p === page ? "page" : undefined}
                        className={cn(
                          "grid h-11 min-w-11 place-items-center rounded-full px-3 text-[15px] font-semibold",
                          p === page ? "bg-bosque text-white" : "text-bosque hover:bg-salvia-100",
                        )}
                      >
                        {p}
                      </Link>
                    ))}
                    {pageLink(page + 1, "Página siguiente", "arrow-right", page >= totalPages)}
                  </nav>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
