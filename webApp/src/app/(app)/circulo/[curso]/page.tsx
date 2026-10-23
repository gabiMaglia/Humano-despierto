import { notFound } from "next/navigation";
import { getCampusThread } from "@/lib/server/campus";
import { getCurrentUser } from "@/lib/server/auth";
import CampusComposer from "@/components/campus/CampusComposer";
import CampusMessage from "@/components/campus/CampusMessage";
import ThreadEmpty from "@/components/campus/ThreadEmpty";
import ThreadHeader from "@/components/campus/ThreadHeader";

interface PageProps {
  params: Promise<{ curso: string }>;
}

// El hilo de UN curso: escriben solo quienes tienen inscripción activa, o la docente dueña
// (0014, criterio 1). `notFound()` sin distinguir "el curso no existe" de "no tenés acceso" —
// mismo patrón que `leccion/[id]` (T-006): la misma respuesta para las dos, nada que confirmar
// desde afuera. `await params` se USA antes de pedir el hilo — la trampa conocida del proyecto
// es justamente pedir el param y no usarlo (CLAUDE.md).
export default async function CampusCoursePage({ params }: PageProps) {
  const { curso } = await params;
  const [user, data] = await Promise.all([getCurrentUser(), getCampusThread(curso)]);

  if (!data) notFound();

  const { thread, canWrite, posts } = data;

  return (
    <>
      <ThreadHeader title={thread.title} subtitle={thread.subtitle} />

      {canWrite ? (
        <CampusComposer
          courseId={thread.courseId}
          courseSlug={thread.slug}
          authorGlyph={user?.glyph ?? null}
          authorName={user?.fullName ?? null}
          placeholder="Compartí una pregunta, una observación, algo del módulo..."
        />
      ) : (
        <p className="border-b border-linea bg-salvia-100 px-5 py-4 text-sm text-tinta md:px-6">
          Estás viendo este hilo con permiso de moderación — escribir acá exige inscripción activa
          en el curso o ser la docente dueña.
        </p>
      )}

      {posts.length === 0 ? (
        <ThreadEmpty title="Este hilo recién empieza">
          Todavía nadie escribió en el hilo de este curso. Un espacio nuevo, no uno abandonado.
        </ThreadEmpty>
      ) : (
        <div>
          {posts.map((post) => (
            <CampusMessage key={post.id} post={post} courseSlug={thread.slug} />
          ))}
        </div>
      )}
    </>
  );
}
