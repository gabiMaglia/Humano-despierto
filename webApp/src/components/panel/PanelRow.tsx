import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/** Fila de una lista de trabajo: título + metadatos a la izquierda, estado y acciones a la derecha.
 *  Los números van en `tabular-nums` para que las columnas se lean parejas. */
export function PanelRow({ children, className }: { children: ReactNode; className?: string }) {
  return <li className={cn("tarjeta flex flex-wrap items-center gap-x-4 gap-y-3 p-4 tabular-nums", className)}>{children}</li>;
}

export function RowMain({ title, meta, children }: { title: ReactNode; meta?: ReactNode; children?: ReactNode }) {
  return (
    <div className="min-w-0 flex-1 basis-56">
      <p className="font-semibold text-tinta [overflow-wrap:anywhere]">{title}</p>
      {meta && <p className="text-sm text-suave [overflow-wrap:anywhere]">{meta}</p>}
      {children}
    </div>
  );
}
