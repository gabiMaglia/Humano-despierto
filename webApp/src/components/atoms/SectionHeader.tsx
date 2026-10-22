import { cn } from "@/lib/utils/cn";

interface Props {
  eyebrow?: string;
  title: string;
  titleEm?: string;
  subtitle?: string;
  align?: "left" | "center";
  className?: string;
}

export default function SectionHeader({
  eyebrow,
  title,
  titleEm,
  subtitle,
  align = "center",
  className,
}: Props) {
  const centered = align === "center";
  return (
    <div className={cn("mb-14", centered && "text-center", className)}>
      {eyebrow && (
        <div className={cn("flex items-center gap-3.5 mb-3.5", centered && "justify-center")}>
          {centered && <div className="h-px flex-1 bg-salvia" />}
          <span className="font-display text-eyebrow tracking-[0.25em] text-bosque whitespace-nowrap">
            {eyebrow}
          </span>
          {centered && <div className="h-px flex-1 bg-salvia" />}
        </div>
      )}
      <h2 className="font-display text-4xl tracking-wider text-tinta mb-4">
        {title}
        {titleEm && (
          <>
            {" "}
            <em className="font-quote italic text-miel-800">{titleEm}</em>
          </>
        )}
      </h2>
      {subtitle && (
        <p
          className={cn(
            "font-quote italic text-xl leading-relaxed text-suave text-pretty",
            centered ? "max-w-[560px] mx-auto" : "max-w-[560px]"
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
