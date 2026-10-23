"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CampusThreadSummary } from "@/lib/server/campus";
import { cn } from "@/lib/utils/cn";

// Solo la parte activa depende del pathname — el listado en sí lo trae el layout del server
// (`getCampusSidebar`, RLS-scoped). 'use client' acá es exactamente el resaltado, no el fetch.
// `chips`: la misma lista en una fila con scroll propio, para el celular (antes no había forma de
// cambiar de hilo por debajo de lg).
export default function CampusSidebar({
  threads,
  variant = "list",
}: {
  threads: CampusThreadSummary[];
  variant?: "list" | "chips";
}) {
  const pathname = usePathname();

  if (variant === "chips") {
    return (
      <nav aria-label="Hilos del Campus" className="-mx-6 overflow-x-auto px-6 pb-1">
        <ul className="flex w-max gap-2">
          {threads.map((t) => {
            const href = t.slug ? `/circulo/${t.slug}` : "/circulo";
            const active = pathname === href;
            return (
              <li key={t.slug ?? "general"}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-10 items-center whitespace-nowrap rounded-pill border-[1.5px] px-4 text-sm font-semibold transition-colors",
                    active ? "border-bosque bg-bosque text-white" : "border-salvia bg-papel text-bosque hover:bg-salvia-100",
                  )}
                >
                  {t.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label="Hilos del Campus">
      <ul className="space-y-1">
        {threads.map((t) => {
          const href = t.slug ? `/circulo/${t.slug}` : "/circulo";
          const active = pathname === href;
          return (
            <li key={t.slug ?? "general"}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors",
                  active ? "bg-salvia-100" : "hover:bg-fondo",
                )}
              >
                {/* El glifo es dato del curso (D-63), no ícono: decorativo, el título lo nombra. */}
                <span
                  aria-hidden="true"
                  className="grid h-9 w-9 flex-none place-items-center rounded-full border border-linea bg-papel text-base text-bosque"
                >
                  {t.glyph}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate text-sm font-semibold", active ? "text-bosque" : "text-tinta")}>
                    {t.title}
                  </span>
                  {t.subtitle && <span className="block truncate text-xs text-suave">{t.subtitle}</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
