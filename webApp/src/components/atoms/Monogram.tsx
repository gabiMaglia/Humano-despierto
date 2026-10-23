import { cn } from "@/lib/utils/cn";
import LeafIllustration from "@/components/atoms/LeafIllustration";
import { initials } from "@/lib/ui/initials";

/** Lugar de la foto de una guía mientras no tengamos su avatar firmado (D-62): sus iniciales,
 *  nunca la cara de otra persona. Decorativo: el nombre ya está escrito al lado. */
export default function Monogram({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={cn("relative grid place-items-center overflow-hidden bg-salvia-100", className)}>
      <LeafIllustration className="absolute -bottom-6 -right-6 w-[120px] opacity-40" />
      <span className={cn("relative font-bold", size === "lg" ? "text-8xl" : "text-5xl", " tracking-[-0.02em] text-bosque")}>{initials(name)}</span>
    </div>
  );
}
