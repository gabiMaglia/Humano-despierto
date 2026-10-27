import { cn } from "@/lib/utils/cn";
import Monogram from "@/components/atoms/Monogram";
import SignedImage from "@/components/atoms/SignedImage";

/** Retrato de una guía: su avatar firmado o, sin él, sus iniciales. Nunca la cara de otra persona
 *  (D-62). `alt` vacío por defecto porque casi siempre el nombre ya está escrito al lado. */
export default function TeacherPortrait({
  name,
  src,
  alt = "",
  size,
  loading,
  className,
}: {
  name: string;
  src: string | null | undefined;
  alt?: string;
  size?: "sm" | "md" | "lg";
  loading?: "lazy" | "eager";
  className?: string;
}) {
  if (!src) return <Monogram name={name} size={size} className={className} />;
  return (
    <div className={cn("relative overflow-hidden bg-salvia-100", className)}>
      <SignedImage src={src} alt={alt} loading={loading} className="absolute inset-0 h-full w-full object-cover" />
    </div>
  );
}
