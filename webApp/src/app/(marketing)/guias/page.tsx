import type { Metadata } from "next";
import GuiaCard from "@/components/molecules/GuiaCard";
import PageIntro from "@/components/layout/PageIntro";
import { getPublicTeachers, signTeacherAvatars } from "@/lib/server/guias";

export const metadata: Metadata = {
  title: "Guías",
  description: "Quiénes enseñan en Humano Despierto: guías que practican lo que enseñan.",
};

export default async function GuiasPage() {
  const guias = await getPublicTeachers();
  const avatars = await signTeacherAvatars(guias);

  return (
    <div className="min-h-screen bg-fondo">
      <PageIntro
        title="Las guías"
        lead="Cada una practica lo que enseña. En su perfil están sus cursos, su formación y lo que dicen sus alumnas."
      />
      <div className="mx-auto max-w-[1200px] px-6 pb-24">
        {guias.length === 0 ? (
          <p className="text-suave">Todavía no hay guías con cursos publicados.</p>
        ) : (
          <div className="grid gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {guias.map((guia) => (
              <GuiaCard key={guia.slug} {...guia} avatarUrl={guia.avatarPath ? avatars.get(guia.avatarPath) : null} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
