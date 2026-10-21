import { notFound } from "next/navigation";
import { getCampusThread } from "@/lib/server/campus";
import { getCurrentUser } from "@/lib/server/auth";
import CampusComposer from "@/components/campus/CampusComposer";
import CampusMessage from "@/components/campus/CampusMessage";

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
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-lila-300/18 p-5">
        <div>
          <h2 className="font-display text-lg tracking-wide text-ink">
            {thread.glyph} {thread.title}
          </h2>
          <p className="font-body text-xs text-ink-faint">{thread.subtitle}</p>
        </div>
      </div>

      {canWrite ? (
        <CampusComposer
          courseId={thread.courseId}
          courseSlug={thread.slug}
          authorGlyph={user?.glyph ?? null}
          placeholder="Compartí una pregunta, una observación, algo del módulo..."
        />
      ) : (
        <p className="border-b border-lila-300/18 px-5 py-4 font-body text-xs text-ink-faint">
          Estás viendo este hilo con permiso de moderación — escribir acá exige inscripción activa
          en el curso o ser la docente dueña.
        </p>
      )}

      {posts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
          <span className="text-3xl text-lila-300">{thread.glyph}</span>
          <p className="font-display text-eyebrow tracking-cosmic text-ink-faint">— Este hilo recién empieza —</p>
          <p className="max-w-sm font-body text-sm text-ink-soft">
            Todavía nadie escribió en el hilo de este curso. Un espacio nuevo, no uno abandonado.
          </p>
        </div>
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
