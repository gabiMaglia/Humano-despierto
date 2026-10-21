import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AuthShell from "@/components/molecules/AuthShell";
import { RECOVER_PATH } from "@/lib/auth/paths";
import NuevaClaveForm from "./NuevaClaveForm";

export const metadata: Metadata = {
  title: "Nueva clave",
  robots: { index: false, follow: false },
};

// La sesión la deja /auth/callback al canjear el code de recuperación. Sin ella no hay a quién
// cambiarle la clave: se vuelve a pedir el enlace.
export default async function NuevaClavePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(RECOVER_PATH);

  return (
    <AuthShell title="Elegí una clave" accent="nueva" lead="La vas a usar desde tu próximo ingreso.">
      <NuevaClaveForm />
    </AuthShell>
  );
}
