import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/molecules/AuthShell";

export const metadata: Metadata = {
  title: "Invitación",
  robots: { index: false, follow: false },
};

// Un solo mensaje para ajena, vencida, revocada o inexistente (SP-4 c.3, c.4): distinguirlas
// le diría a quien tiene un link ajeno qué probar.
export default function InvitacionInvalidaPage() {
  return (
    <AuthShell
      title="Esta invitación"
      accent="no es válida o venció"
      lead="Pedile a quien te invitó que te mande una nueva, o entrá con el mail al que te llegó."
    >
      <Link href="/entrar" className="btn-ritual btn-ritual-ghost rounded-pill text-[10px]">
        Ir a entrar
      </Link>
    </AuthShell>
  );
}
