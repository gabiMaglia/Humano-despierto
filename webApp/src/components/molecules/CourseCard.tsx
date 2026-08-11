import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import Avatar from "@/components/atoms/Avatar";

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
}

interface Props extends CourseCardData {
  className?: string;
}

export default function CourseCard({
  num, tag, title, titleEm, desc, teacher, price,
  weeks, level, moon, featured, slug, className,
}: Props) {
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
    <Link
      href={`/cursos/${slug}`}
      className={cn(
        "cosmos-card group relative flex h-full cursor-pointer flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lila-glow",
        featured && "border-lila-300/40 bg-cosmos-elev",
        className
      )}
    >
      {/* Image placeholder */}
      <div className="relative shrink-0 overflow-hidden bg-linear-to-br from-lila-700 to-cosmos-2 aspect-[4/3]">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 30% 40%, rgba(245,215,110,0.3), transparent 50%), radial-gradient(circle at 70% 60%, rgba(236,72,153,0.25), transparent 50%)",
          }}
        />
        {/* Moon phase badge */}
        {moon && (
          <span className="absolute top-3 left-3 font-display text-base text-gold-400">
            {moon}
          </span>
        )}
        {/* Featured flag */}
        {featured && (
          <span className="absolute top-3 right-3 font-display text-eyebrow tracking-cosmic text-gold-400 bg-cosmos-0/70 px-2 py-0.5 rounded-pill">
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
          <span className="truncate text-gold-400">✦ {tag}</span>
          <div className="flex shrink-0 items-center gap-1.5 text-ink-faint">
            {level && <span>{level}</span>}
            {level && weeks && <span>·</span>}
            {weeks && <span>☾ {weeks}</span>}
          </div>
        </div>

        {/* Dos líneas fijas: un título corto y uno largo ocupan lo mismo, así la
            descripción y el pie no se desplazan de una card a otra. */}
        <h3 className="mb-2.5 line-clamp-2 h-[2lh] font-display text-xl leading-snug tracking-wide text-ink">
          {title}
          {titleEm && (
            <>
              {" "}
              <em className="font-quote italic text-lila-300">{titleEm}</em>
            </>
          )}
        </h3>

        {/* Alto fijo de 3 líneas. Si la descripción es más larga, se scrollea acá
            dentro en vez de estirar la card. */}
        <p className="mb-4 h-[3lh] overflow-y-auto pr-1 font-body text-sm leading-relaxed text-ink-soft [scrollbar-color:var(--color-lila-300)_transparent] [scrollbar-width:thin]">
          {desc}
        </p>

        {/* mt-auto: el pie queda pegado abajo aunque el resto no llene el alto. */}
        <div className="mt-auto flex items-center justify-between border-t border-lila-300/18 pt-3.5">
          <div className="flex items-center gap-2.5">
            <Avatar size="sm" />
            <span className="font-body text-xs text-ink-soft">{teacher}</span>
          </div>
          <span className="font-display text-sm tracking-wide text-gold-400">{price}</span>
        </div>
      </div>
    </Link>
  );
}
