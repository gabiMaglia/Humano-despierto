import type { ReactNode } from "react";
import Link from "next/link";
import { Q_MAX, pageHref } from "@/lib/admin/list-params";

interface Props {
  path: string;
  q: string | null;
  next: string | null;
  isEmpty: boolean;
  searchLabel: string;
  searchButton: string;
  emptyLabel: string;
  nextLabel: string;
  children: ReactNode;
}

/** Formulario GET y link "siguiente": busca y pagina sin JS. Sin "anterior" (keyset). */
export default function AdminPagedList({ path, q, next, isEmpty, searchLabel, searchButton, emptyLabel, nextLabel, children }: Props) {
  return (
    <div>
      <form method="get" action={path} role="search" className="mb-5 flex flex-wrap items-end gap-3">
        <label className="min-w-[220px] flex-1">
          <span className="mb-1.5 block font-display text-eyebrow tracking-cosmic text-ink-soft">{searchLabel}</span>
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            maxLength={Q_MAX}
            className="w-full rounded-ritual border border-lila-300/20 bg-cosmos-0/60 px-3 py-2.5 font-body text-xs text-ink outline-none transition-colors focus:border-lila-300/50 focus:bg-cosmos-0"
          />
        </label>
        <button type="submit" className="btn-ritual btn-ritual-ghost flex-none rounded-pill text-[10px]">
          {searchButton}
        </button>
      </form>
      <ul className="space-y-3">
        {isEmpty ? <li className="font-body text-sm text-ink-faint">{emptyLabel}</li> : children}
      </ul>
      {next && (
        <div className="mt-5 flex justify-end">
          <Link href={pageHref(path, q, next)} rel="next" className="btn-ritual btn-ritual-ghost rounded-pill text-[10px]">
            {nextLabel}
          </Link>
        </div>
      )}
    </div>
  );
}
