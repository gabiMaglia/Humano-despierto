// Lógica de datos del catálogo (T-019), separada de la vista (`page.tsx`). Todo lo que devuelve
// cada función acá sale de los cursos reales que llegaron desde la base (`getPublishedCourses`) —
// nada de conteos inventados. Ver `src/lib/utils/taxonomy.ts` para la decisión de normalización
// (Q-05).
import type { PublishedCourseSummary } from "@/lib/server/courses";
import {
  bucketForDurationSeconds,
  DURATION_BUCKETS,
  normalizeTaxonomyKey,
  taxonomyLabel,
  type DurationBucketKey,
} from "@/lib/utils/taxonomy";

export const PAGE_SIZE = 9;

export interface CatalogFilterState {
  disciplines: string[];
  levels: string[];
  durations: DurationBucketKey[];
  query: string;
  page: number;
}

export interface AnnotatedCourse extends PublishedCourseSummary {
  disciplineKey: string;
  levelKey: string;
  durationKey: DurationBucketKey;
}

export interface FacetOption {
  key: string;
  label: string;
  count: number;
  active: boolean;
}

type SearchParamsInput = Record<string, string | string[] | undefined>;

function firstValue(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

function parseKeyList(v: string | string[] | undefined): string[] {
  return [...new Set(firstValue(v).split(",").map(normalizeTaxonomyKey).filter(Boolean))];
}

export function parseCatalogFilterState(sp: SearchParamsInput): CatalogFilterState {
  const durationKeys = parseKeyList(sp.duracion).filter((d): d is DurationBucketKey =>
    DURATION_BUCKETS.some((b) => b.key === d)
  );
  const pageRaw = Number(firstValue(sp.page));
  return {
    disciplines: parseKeyList(sp.disciplina),
    levels: parseKeyList(sp.nivel),
    durations: durationKeys,
    query: firstValue(sp.q).trim(),
    page: Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1,
  };
}

export function toURLSearchParams(sp: SearchParamsInput): URLSearchParams {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) usp.append(key, v);
    } else {
      usp.set(key, value);
    }
  }
  return usp;
}

export function annotateCourses(courses: PublishedCourseSummary[]): AnnotatedCourse[] {
  return courses.map((c) => ({
    ...c,
    disciplineKey: normalizeTaxonomyKey(c.discipline),
    levelKey: normalizeTaxonomyKey(c.level),
    durationKey: bucketForDurationSeconds(c.totalDurationSeconds),
  }));
}

function matchesSearch(course: AnnotatedCourse, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [course.title, course.subtitle, course.desc].some((field) =>
    (field ?? "").toLowerCase().includes(q)
  );
}

type FacetDimension = "discipline" | "level" | "duration";

function matchesFilters(
  course: AnnotatedCourse,
  state: CatalogFilterState,
  skip?: FacetDimension
): boolean {
  if (!matchesSearch(course, state.query)) return false;
  if (skip !== "discipline" && state.disciplines.length && !state.disciplines.includes(course.disciplineKey)) {
    return false;
  }
  if (skip !== "level" && state.levels.length && !state.levels.includes(course.levelKey)) {
    return false;
  }
  if (skip !== "duration" && state.durations.length && !state.durations.includes(course.durationKey)) {
    return false;
  }
  return true;
}

export function filterCourses(courses: AnnotatedCourse[], state: CatalogFilterState): AnnotatedCourse[] {
  return courses.filter((c) => matchesFilters(c, state));
}

// Conteo por opción = cuántos cursos quedarían si SUMARA esa opción a los filtros activos de
// las otras dimensiones (más la búsqueda). Es el único conteo que no miente: si el visitante
// ya filtró por "Tarot" y mira "Nivel", ve cuántos cursos de Tarot hay en cada nivel — no el
// total del catálogo entero.
const LEVEL_DISPLAY_ORDER = ["inicial", "intermedio", "maestría"];

export function buildDisciplineFacets(courses: AnnotatedCourse[], state: CatalogFilterState): FacetOption[] {
  const keys = [...new Set(courses.map((c) => c.disciplineKey))];
  return keys
    .map((key) => ({
      key,
      label: taxonomyLabel(key),
      count: courses.filter((c) => c.disciplineKey === key && matchesFilters(c, state, "discipline")).length,
      active: state.disciplines.includes(key),
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function buildLevelFacets(courses: AnnotatedCourse[], state: CatalogFilterState): FacetOption[] {
  const keys = [...new Set(courses.map((c) => c.levelKey))];
  return keys
    .map((key) => ({
      key,
      label: taxonomyLabel(key),
      count: courses.filter((c) => c.levelKey === key && matchesFilters(c, state, "level")).length,
      active: state.levels.includes(key),
    }))
    .sort((a, b) => {
      const ia = LEVEL_DISPLAY_ORDER.indexOf(a.key);
      const ib = LEVEL_DISPLAY_ORDER.indexOf(b.key);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.label.localeCompare(b.label);
    });
}

export function buildDurationFacets(courses: AnnotatedCourse[], state: CatalogFilterState): FacetOption[] {
  return DURATION_BUCKETS.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    count: courses.filter((c) => c.durationKey === bucket.key && matchesFilters(c, state, "duration")).length,
    active: state.durations.includes(bucket.key),
  }));
}

export function toggleListParam(current: URLSearchParams, param: string, value: string): URLSearchParams {
  const next = new URLSearchParams(current);
  const existing = new Set(
    (next.get(param) ?? "").split(",").map((s) => s.trim()).filter(Boolean)
  );
  if (existing.has(value)) existing.delete(value);
  else existing.add(value);
  if (existing.size) next.set(param, [...existing].join(","));
  else next.delete(param);
  next.delete("page");
  return next;
}

export function withoutParam(current: URLSearchParams, param: string): URLSearchParams {
  const next = new URLSearchParams(current);
  next.delete(param);
  next.delete("page");
  return next;
}

export function withPage(current: URLSearchParams, page: number): URLSearchParams {
  const next = new URLSearchParams(current);
  if (page > 1) next.set("page", String(page));
  else next.delete("page");
  return next;
}

export function hrefFor(params: URLSearchParams): string {
  const qs = params.toString();
  return qs ? `/cursos?${qs}` : "/cursos";
}

export interface Paginated<T> {
  items: T[];
  page: number;
  totalPages: number;
}

export function paginate<T>(items: T[], page: number, pageSize: number): Paginated<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const clampedPage = Math.min(Math.max(1, page), totalPages);
  const start = (clampedPage - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page: clampedPage, totalPages };
}
