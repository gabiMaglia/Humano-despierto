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
  format?: string;
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
  weeks, format, level, moon, featured, slug, className,
}: Props) {
  return (
    <article
      className={cn(
        "cosmos-card group relative cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lila-glow",
        featured && "border-lila-300/40 bg-cosmos-elev",
        className
      )}
    >
      {/* Image placeholder */}
      <div className="relative overflow-hidden bg-linear-to-br from-lila-700 to-cosmos-2 aspect-[4/3]">
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
      <div className="p-5 md:p-6">
        <div className="mb-3 flex items-center justify-between font-display text-eyebrow uppercase tracking-[0.2em]">
          <span className="text-gold-400">✦ {tag}</span>
          <div className="flex items-center gap-1.5 text-ink-faint">
            {level && <span>{level}</span>}
            {level && weeks && <span>·</span>}
            {weeks && <span>☾ {weeks}</span>}
          </div>
        </div>

        <h3 className="mb-2.5 font-display text-xl leading-snug tracking-wide text-ink">
          {title}
          {titleEm && (
            <>
              {" "}
              <em className="font-quote italic text-lila-300">{titleEm}</em>
            </>
          )}
        </h3>

        <p className="mb-4 font-body text-sm leading-relaxed text-ink-soft">{desc}</p>

        <div className="flex items-center justify-between border-t border-lila-300/18 pt-3.5">
          <div className="flex items-center gap-2.5">
            <Avatar size="sm" />
            <span className="font-body text-xs text-ink-soft">{teacher}</span>
          </div>
          <span className="font-display text-sm tracking-wide text-gold-400">{price}</span>
        </div>
      </div>
    </article>
  );
}
