import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/auth";

// Segunda capa de guard de rol (la primera es el middleware, `src/proxy.ts`,
// que redirige por el CLAIM del JWT — orientativo, ADR-006). Acá se vuelve a
// resolver contra `profiles.role`, la única autoridad: un admin recién
// degradado cuyo token todavía dice "admin" (hasta el próximo refresh) no
// entra igual. `(app)/layout.tsx` ya exige sesión; este layout exige además
// el rol.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    redirect("/panel");
  }

  return <>{children}</>;
}
