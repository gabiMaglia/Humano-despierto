import SubNavTabs from "@/components/molecules/SubNavTabs";

const TABS = [
  { key: "cursos", href: "/panel/docente", label: "Cursos" },
  { key: "diario", href: "/panel/docente/diario", label: "Diario" },
] as const;

/** Sub-navegación del panel docente. */
export default function PanelTabs({ active }: { active: "cursos" | "diario" }) {
  return <SubNavTabs tabs={TABS} active={active} />;
}
