import type { Metadata } from "next";
import { ButtonLink } from "@/components/atoms/Button";
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
      aside="invitacion"
      title="Esta invitación"
      accent="no es válida o venció"
      lead="Pedile a quien te invitó que te mande una nueva, o entrá con el mail al que te llegó."
    >
      <ButtonLink href="/entrar" variant="outline">
        Ir a entrar
      </ButtonLink>
    </AuthShell>
  );
}
