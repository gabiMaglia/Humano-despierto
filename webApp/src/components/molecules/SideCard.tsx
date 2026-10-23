import { cn } from "@/lib/utils/cn";

interface Props {
  title?: string;
  badge?: string;
  children: React.ReactNode;
  className?: string;
}

export default function SideCard({ title, badge, children, className }: Props) {
  return (
    <section className={cn("tarjeta p-5", className)}>
      {(title || badge) && (
        <div className="mb-4 flex items-center justify-between">
          {title && (
            <h3 className="font-display text-sm tracking-wide text-tinta">{title}</h3>
          )}
          {badge && (
            <span className="font-display text-eyebrow tracking-wide text-suave uppercase">
              {badge}
            </span>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
