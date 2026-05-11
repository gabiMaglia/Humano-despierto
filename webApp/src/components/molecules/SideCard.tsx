import { cn } from "@/lib/utils/cn";

interface Props {
  title?: string;
  badge?: string;
  children: React.ReactNode;
  className?: string;
}

export default function SideCard({ title, badge, children, className }: Props) {
  return (
    <section className={cn("cosmos-card p-5", className)}>
      {(title || badge) && (
        <div className="mb-4 flex items-center justify-between">
          {title && (
            <h3 className="font-display text-sm tracking-wide text-ink">{title}</h3>
          )}
          {badge && (
            <span className="font-display text-eyebrow tracking-cosmic text-ink-faint uppercase">
              {badge}
            </span>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
