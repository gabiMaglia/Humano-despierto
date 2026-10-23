import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/** Título de sección B4: h2 grande, bosque, con una bajada opcional en `suave`. */
export default function SectionHeading({
  id,
  title,
  lead,
  size = "lg",
  className,
}: {
  id?: string;
  title: ReactNode;
  lead?: ReactNode;
  size?: "lg" | "md";
  className?: string;
}) {
  return (
    <div className={cn("mb-10", className)}>
      <h2 id={id} className={size === "lg" ? "text-display-md leading-[1.12]" : "text-2xl leading-snug md:text-[28px]"}>
        {title}
      </h2>
      {lead && <p className="mt-3 max-w-[46ch] text-suave">{lead}</p>}
    </div>
  );
}
