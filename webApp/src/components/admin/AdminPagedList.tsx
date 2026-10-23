import type { ReactNode } from "react";
import Button, { ButtonLink } from "@/components/atoms/Button";
import { PanelInput } from "@/components/panel/PanelField";
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
      <form method="get" action={path} role="search" className="mb-5 flex flex-wrap items-start gap-3">
        <PanelInput className="min-w-56 flex-1" type="search" name="q" label={searchLabel} defaultValue={q ?? ""} maxLength={Q_MAX} />
        <Button type="submit" variant="outline" className="sm:mt-[1.625rem]">
          {searchButton}
        </Button>
      </form>
      <ul className="space-y-3">
        {isEmpty ? <li className="tarjeta p-5 text-suave">{emptyLabel}</li> : children}
      </ul>
      {next && (
        <div className="mt-5 flex justify-end">
          <ButtonLink href={pageHref(path, q, next)} variant="outline" arrow>
            {nextLabel}
          </ButtonLink>
        </div>
      )}
    </div>
  );
}
