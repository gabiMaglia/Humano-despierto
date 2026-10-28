import Link from "next/link";
import type { ReactNode } from "react";
import SiteHeader from "@/components/layout/SiteHeader";
import { cn } from "@/lib/utils/cn";

const WIDTH = { narrow: "max-w-3xl", default: "max-w-4xl", wide: "max-w-5xl" } as const;

interface Props {
  title: ReactNode;
  /** Una línea de contexto sobre el título (curso, ruta, quién es). Texto normal, no ornamento. */
  context?: ReactNode;
  back?: { href: string; label: string };
  /** Pestañas del panel (`SubNavTabs`). */
  tabs?: ReactNode;
  /** Acciones de la cabecera: crear, publicar. */
  actions?: ReactNode;
  width?: keyof typeof WIDTH;
  children: ReactNode;
}

/** Marco común de las pantallas de trabajo del docente y del admin (T-064): cabecera clara,
 *  pestañas arriba, contenido en columna. Es interfaz de trabajo: nada decorativo. */
export default function PanelFrame({ title, context, back, tabs, actions, width = "default", children }: Props) {
  return (
    <div className="min-h-screen bg-fondo text-tinta">
      <SiteHeader />
      <div className="pt-16">
        {tabs && (
          <div className="border-b border-linea bg-papel">
            <div className={cn("mx-auto px-6 md:px-12", WIDTH[width])}>{tabs}</div>
          </div>
        )}
        <header className="border-b border-linea bg-papel">
          <div className={cn("mx-auto flex flex-wrap items-start justify-between gap-x-6 gap-y-4 px-6 py-8 md:px-12", WIDTH[width])}>
            <div className="min-w-0 flex-1">
              {back && (
                <Link href={back.href} className="-mb-1 inline-flex min-h-12 items-center text-sm font-semibold text-miel-800 hover:underline">
                  <span aria-hidden="true" className="mr-1.5">←</span>
                  {back.label}
                </Link>
              )}
              {context && <p className="mb-1 text-sm text-suave [overflow-wrap:anywhere]">{context}</p>}
              <h1 className="text-3xl font-semibold text-bosque md:text-4xl [overflow-wrap:anywhere]">{title}</h1>
            </div>
            {actions && <div className="flex flex-none flex-wrap items-center gap-3">{actions}</div>}
          </div>
        </header>
        <div className={cn("mx-auto space-y-10 px-6 py-10 md:px-12", WIDTH[width])}>{children}</div>
      </div>
    </div>
  );
}
