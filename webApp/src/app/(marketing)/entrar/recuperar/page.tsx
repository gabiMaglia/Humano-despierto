import type { Metadata } from "next";
import AuthShell from "@/components/molecules/AuthShell";
import RecuperarForm from "./RecuperarForm";

export const metadata: Metadata = {
  title: "Recuperar clave",
  robots: { index: false, follow: false },
};

export default function RecuperarPage() {
  return (
    <AuthShell title="Recuperá tu" accent="clave" lead="Escribí el mail con el que te registraste.">
      <RecuperarForm />
    </AuthShell>
  );
}
