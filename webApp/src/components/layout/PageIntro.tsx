import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/** Encabezado de página interna (B4): título grande y bajada a la izquierda, sin etiqueta encima. */
export default function PageIntro({
  title,
  lead,
  children,
  className,
}: {
  title: ReactNode;
  lead?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mx-auto max-w-[1200px] px-6 pb-10 pt-14 md:pt-20", className)}>
      <h1 className="max-w-[18ch] text-display-lg leading-[1.08] tracking-[-0.025em]">{title}</h1>
      {lead && <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-suave">{lead}</p>}
      {children && <div className="mt-8">{children}</div>}
    </header>
  );
}
