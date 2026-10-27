import { cn } from "@/lib/utils/cn";
import LeafIllustration from "@/components/atoms/LeafIllustration";
import { initials } from "@/lib/ui/initials";

const SIZE = { sm: "text-base", md: "text-5xl", lg: "text-8xl" } as const;

/** Lugar de la foto de una guía que no subió avatar: sus iniciales, nunca la cara de otra persona.
 *  Decorativo: el nombre ya está escrito al lado. Se usa a través de `TeacherPortrait`. */
export default function Monogram({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={cn("relative grid place-items-center overflow-hidden bg-salvia-100", className)}>
      {size !== "sm" && <LeafIllustration className="absolute -bottom-6 -right-6 w-[120px] opacity-40" />}
      <span className={cn("relative font-bold tracking-[-0.02em] text-bosque", SIZE[size])}>{initials(name)}</span>
    </div>
  );
}
