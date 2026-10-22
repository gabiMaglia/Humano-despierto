import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import Avatar from "@/components/atoms/Avatar";
import SignedImage from "@/components/atoms/SignedImage";
import Stars from "@/components/reviews/Stars";
import { formatRating } from "@/lib/reviews/rating";
import WishlistButton from "@/components/course/WishlistButton";

export interface CourseCardData {
  num: string;
  tag: string;
  title: string;
  titleEm?: string;
  desc: string;
  teacher: string;
  price: string;
  weeks?: string;
  level?: string;
  moon?: string;
  featured?: boolean;
  slug: string;
  /** Promedio 1..5 y total de reseñas visibles; sin ellos la tarjeta no dibuja señal alguna. */
  rating?: number;
  reviewCount?: number;
  /** URL firmada de la portada (T-047); sin ella, el degradado de siempre. */
  coverUrl?: string;
}

interface Props extends CourseCardData {
  className?: string;
  /** T-033 · sin esto la card no dibuja botón (landing). `loginHref` solo sin sesión. */
  wishlist?: { courseId: string; saved: boolean; loginHref: string | null };
}

export default function CourseCard({
  num, tag, title, titleEm, desc, teacher, price,
  weeks, level, moon, featured, slug, rating, reviewCount, coverUrl, className, wishlist,
}: Props) {
  const ratingText = rating !== undefined && reviewCount ? formatRating(rating, reviewCount) : null;
  return (
    // El <article> entero es un link al detalle. La card tenia `cursor-pointer` desde la
    // maqueta pero nunca tuvo `Link`: la unica forma de llegar a un curso era tipear la
    // URL. Es el camino de navegacion principal del producto y estuvo roto todo el
    // tiempo, tapado por un cursor que prometia que se podia hacer click.
    //
    // Altura fija y estructura de alto determinado: el tag, el titulo, la descripcion
    // y el pie ocupan siempre lo mismo, sin importar cuanto texto traiga cada curso.
    // Antes cada card medía distinto segun el largo de la descripcion y la grilla
    // quedaba despareja.
    //
    // T-033 · el botón de guardar es HERMANO del link, no hijo: un <button> dentro de un <a> es
    // HTML inválido. El elevado al hover vive en el contenedor para que se muevan juntos.
    <div className={cn("group relative h-full transition-transform duration-300 hover:-translate-y-1", className)}>
    <Link
      href={`/cursos/${slug}`}
      className={cn(
        "tarjeta relative flex h-full cursor-pointer flex-col overflow-hidden transition-shadow duration-300 group-hover:shadow-card",
        featured && "border-linea bg-salvia-100"
      )}
    >
      {/* Image placeholder */}
      <div className="relative shrink-0 overflow-hidden bg-salvia-100 aspect-[4/3]">
        {coverUrl ? (
          // alt vacio: la card ya nombra el curso en su h3; leerlo dos veces es ruido.
          <SignedImage src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 30% 40%, rgba(245,215,110,0.3), transparent 50%), radial-gradient(circle at 70% 60%, rgba(236,72,153,0.25), transparent 50%)",
            }}
          />
        )}
        {/* Moon phase badge */}
        {moon && (
          <span className="absolute top-3 left-3 font-display text-base text-miel-800">
            {moon}
          </span>
        )}
        {/* Featured flag */}
        {featured && (
          <span className="absolute top-3 right-14 font-display text-eyebrow tracking-wide text-miel-800 bg-papel px-2 py-0.5 rounded-pill">
            ✦ destacado
          </span>
        )}
        <span className="absolute bottom-[-10px] right-3 select-none font-display text-[80px] font-bold leading-none text-white/[0.08]">
          {num}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5 md:p-6">
        <div className="mb-3 flex h-[1lh] items-center justify-between overflow-hidden font-display text-eyebrow uppercase tracking-[0.2em]">
          <span className="truncate text-miel-800">✦ {tag}</span>
          <div className="flex shrink-0 items-center gap-1.5 text-suave">
            {level && <span>{level}</span>}
            {level && weeks && <span>·</span>}
            {weeks && <span>☾ {weeks}</span>}
          </div>
        </div>

        {/* Dos líneas fijas: un título corto y uno largo ocupan lo mismo, así la
            descripción y el pie no se desplazan de una card a otra. */}
        <h3 className="mb-2.5 line-clamp-2 h-[2lh] font-display text-xl leading-snug tracking-wide text-tinta">
          {title}
          {titleEm && (
            <>
              {" "}
              <em className="font-quote italic text-miel-800">{titleEm}</em>
            </>
          )}
        </h3>

        {/* Alto fijo de 3 líneas. Si la descripción es más larga, se scrollea acá
            dentro en vez de estirar la card. */}
        <p className="mb-4 h-[3lh] overflow-y-auto pr-1 font-body text-sm leading-relaxed text-suave [scrollbar-color:var(--color-salvia)_transparent] [scrollbar-width:thin]">
          {desc}
        </p>

        {/* Alto fijo aunque no haya reseñas: el hueco no dibuja nada y la grilla no se desempareja. */}
        <div className="mb-3 flex h-5 items-center gap-2">
          {ratingText && rating !== undefined && (
            <>
              <Stars value={rating} />
              <span className="font-display text-eyebrow tracking-wide text-suave">{ratingText}</span>
            </>
          )}
        </div>

        {/* mt-auto: el pie queda pegado abajo aunque el resto no llene el alto. */}
        <div className="mt-auto flex items-center justify-between border-t border-linea pt-3.5">
          <div className="flex items-center gap-2.5">
            <Avatar size="sm" />
            <span className="font-body text-xs text-suave">{teacher}</span>
          </div>
          <span className="font-display text-sm tracking-wide text-miel-800">{price}</span>
        </div>
      </div>
    </Link>
    {wishlist && (
      <WishlistButton
        {...wishlist}
        className="absolute right-3 top-3 z-10"
      />
    )}
    </div>
  );
}
