import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import SignedImage from "@/components/atoms/SignedImage";
import Rating from "@/components/atoms/Rating";
import WishlistButton from "@/components/course/WishlistButton";
import { placeholderForDiscipline, unsplashUrl } from "@/content/placeholder-photos";

export interface CourseCardData {
  /** Disciplina: elige la foto de muestra cuando el curso no tiene portada. */
  tag: string;
  title: string;
  titleEm?: string;
  /** Hoy no se dibuja (B4 no lo muestra en la tarjeta); queda para la ficha y el buscador. */
  desc?: string;
  teacher: string;
  price: string;
  level?: string;
  featured?: boolean;
  slug: string;
  /** Promedio 1..5 y total de reseñas visibles; sin ellos, «Curso nuevo» (R-01). */
  rating?: number;
  reviewCount?: number;
  /** URL firmada de la portada (T-047); sin ella, una foto de muestra de su disciplina. */
  coverUrl?: string;
}

interface Props extends CourseCardData {
  className?: string;
  /** La primera fila de una grilla está sobre el pliegue: su foto no espera al lazy. */
  eager?: boolean;
  /** T-033 · sin esto la card no dibuja botón (landing). `loginHref` solo sin sesión. */
  wishlist?: { courseId: string; saved: boolean; loginHref: string | null };
}

/** Imagen 4:3 y tarjeta blanca superpuesta (B4). La tarjeta entera es el link al detalle: es el
 *  camino de navegación principal del producto. El botón de guardar es HERMANO del link (un
 *  <button> dentro de un <a> es HTML inválido). */
export default function CourseCard({
  tag, title, titleEm, teacher, price, level, featured, slug, rating, reviewCount, coverUrl,
  className, wishlist, eager,
}: Props) {
  const placeholder = placeholderForDiscipline(tag);
  return (
    <div className={cn("group relative h-full", className)}>
      <Link href={`/cursos/${slug}`} className="relative flex h-full flex-col pb-[88px]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-salvia">
          {coverUrl ? (
            // alt vacío: el h3 ya nombra el curso; leerlo dos veces es ruido.
            <SignedImage
              src={coverUrl}
              alt=""
              loading={eager ? "eager" : "lazy"}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-brote group-hover:scale-105 motion-reduce:transition-none"
            />
          ) : (
            <Image
              src={unsplashUrl(placeholder.id)}
              alt=""
              fill
              loading={eager ? "eager" : "lazy"}
              sizes="(min-width: 1280px) 380px, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-[1200ms] ease-brote group-hover:scale-105 motion-reduce:transition-none"
            />
          )}
          {featured && (
            <span className="absolute left-3 top-3 rounded-pill bg-miel-100 px-3 py-1 text-xs font-semibold text-miel-800">
              Destacado
            </span>
          )}
        </div>

        <div className="absolute inset-x-4 bottom-0 flex flex-col rounded-[14px] bg-papel px-5 pb-5 pt-5 shadow-card transition-transform duration-[850ms] ease-circ motion-reduce:transition-none sm:inset-x-6 [@media(hover:hover)]:group-hover:-translate-y-[18px]">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-miel-800">
            {tag}
            {level && <span className="text-suave"> · {level}</span>}
          </p>
          <h3 className="mb-1.5 line-clamp-2 text-xl leading-snug">
            {title}
            {titleEm && <> {titleEm}</>}
          </h3>
          <p className="text-sm leading-normal text-suave">Con {teacher}</p>
          <Rating average={rating} count={reviewCount} className="mt-1.5" />
          <div className="mt-3.5 flex items-center justify-end border-t border-linea pt-3.5 text-sm">
            <b className="font-semibold text-bosque">{price}</b>
          </div>
        </div>
      </Link>
      {wishlist && <WishlistButton {...wishlist} className="absolute right-3 top-3 z-10" />}
    </div>
  );
}
