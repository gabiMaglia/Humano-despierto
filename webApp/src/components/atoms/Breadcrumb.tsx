interface Crumb {
  label: string;
  href?: string;
}

interface Props {
  crumbs: Crumb[];
}

export default function Breadcrumb({ crumbs }: Props) {
  return (
    <nav className="flex items-center gap-2 px-6 py-3 md:px-12 border-b border-linea font-display text-eyebrow tracking-wide text-suave">
      {crumbs.map((crumb, i) => (
        <span key={crumb.label} className="flex items-center gap-2">
          {i > 0 && <span className="text-miel-800">·</span>}
          {crumb.href && i < crumbs.length - 1 ? (
            <a href={crumb.href} className="hover:text-suave transition-colors">
              ← {crumb.label}
            </a>
          ) : (
            <span className={i === crumbs.length - 1 ? "text-suave" : ""}>
              {crumb.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
