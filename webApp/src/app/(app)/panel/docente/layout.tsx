import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/auth";

// Segunda capa de guard de rol (la primera es `src/proxy.ts`, que redirige por el CLAIM del
// JWT — orientativo, ADR-006). Acá se resuelve contra `profiles.role`, la única autoridad:
// un docente recién degradado cuyo token todavía dice "teacher" (hasta el próximo refresh)
// no entra igual. Mismo patrón que `panel/admin/layout.tsx` (T-008).
export default async function TeacherPanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user || user.role !== "teacher") {
    redirect("/panel");
  }

  return <>{children}</>;
}
