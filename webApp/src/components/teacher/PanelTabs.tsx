import SubNavTabs from "@/components/molecules/SubNavTabs";

const TABS = [
  { key: "cursos", href: "/panel/docente", label: "Cursos" },
  { key: "diario", href: "/panel/docente/diario", label: "Diario" },
  { key: "anuncios", href: "/panel/docente/anuncios", label: "Anuncios" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/** Sub-navegación del panel docente. */
export default function PanelTabs({ active }: { active: TabKey }) {
  return <SubNavTabs tabs={TABS} active={active} />;
}
