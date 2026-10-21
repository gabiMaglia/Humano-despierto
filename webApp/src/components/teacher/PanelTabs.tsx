import Link from "next/link";

const TABS = [
  { href: "/panel/docente", label: "Cursos" },
  { href: "/panel/docente/diario", label: "Diario" },
] as const;

/** Sub-navegación del panel docente. T-022 agrega "Diario" al lado de "Cursos". */
export default function PanelTabs({ active }: { active: "cursos" | "diario" }) {
  return (
    <nav className="flex gap-2 border-b border-lila-300/18 bg-cosmos-surface px-6 pt-4 md:px-12">
      {TABS.map((tab, i) => {
        const isActive = (i === 0 && active === "cursos") || (i === 1 && active === "diario");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-t-ritual px-4 py-2 font-display text-eyebrow tracking-cosmic transition-colors ${
              isActive
                ? "border border-b-0 border-lila-300/30 bg-cosmos-0 text-lila-300"
                : "text-ink-faint hover:text-ink-soft"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
