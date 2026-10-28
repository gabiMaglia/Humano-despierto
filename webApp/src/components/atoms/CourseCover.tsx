import Image from "next/image";
import SignedImage from "@/components/atoms/SignedImage";
import { placeholderForDiscipline, unsplashUrl } from "@/content/placeholder-photos";

/** Foto de un curso dentro de un contenedor `relative`: su portada firmada o, sin ella, la foto de
 *  muestra de su disciplina. `alt` vacío: quien la usa ya nombra el curso al lado. */
export default function CourseCover({
  coverUrl,
  discipline,
  sizes,
  eager,
  className,
}: {
  coverUrl: string | null | undefined;
  discipline: string;
  sizes: string;
  eager?: boolean;
  className?: string;
}) {
  if (coverUrl) {
    return (
      <SignedImage
        src={coverUrl}
        alt=""
        loading={eager ? "eager" : "lazy"}
        className={`absolute inset-0 h-full w-full object-cover ${className ?? ""}`}
      />
    );
  }
  return (
    <Image
      src={unsplashUrl(placeholderForDiscipline(discipline).id)}
      alt=""
      fill
      loading={eager ? "eager" : "lazy"}
      sizes={sizes}
      className={`object-cover ${className ?? ""}`}
    />
  );
}
