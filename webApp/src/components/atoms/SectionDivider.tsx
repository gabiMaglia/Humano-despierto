import { cn } from "@/lib/utils/cn";

interface Props {
  label: string;
  className?: string;
}

export default function SectionDivider({ label, className }: Props) {
  return (
    <div className={cn("flex items-center gap-3.5", className)}>
      <div className="h-px flex-1 bg-lila-300/18" />
      <span className="font-display text-eyebrow uppercase tracking-[0.25em] text-ink-faint whitespace-nowrap">
        {label}
      </span>
      <div className="h-px flex-1 bg-lila-300/18" />
    </div>
  );
}
