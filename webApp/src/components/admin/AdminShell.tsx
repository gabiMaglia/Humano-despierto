import type { ReactNode } from "react";
import PanelFrame from "@/components/panel/PanelFrame";
import AdminTabs, { type AdminTab } from "./AdminTabs";

interface Props {
  active: AdminTab;
  /** Reseñas (T-037) tiene su propio título; el resto usa el del panel. */
  heading?: ReactNode;
  children: ReactNode;
}

export default function AdminShell({ active, heading = "Panel de administración", children }: Props) {
  return (
    <PanelFrame title={heading} tabs={<AdminTabs active={active} />} width="wide">
      {children}
    </PanelFrame>
  );
}
