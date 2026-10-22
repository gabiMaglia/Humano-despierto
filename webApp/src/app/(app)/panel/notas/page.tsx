import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/layout/Nav";
import { getStudentNotes } from "@/lib/server/notes";
import { formatClock } from "@/components/player/formatClock";

export const metadata: Metadata = {
  title: "Mis notas",
  robots: { index: false, follow: false },
};

// T-046 · vista de solo lectura: editar y borrar viven en la lección, donde está el video.
export default async function NotasPage() {
  const groups = await getStudentNotes();

  return (
    <div className="min-h-screen bg-fondo text-tinta">
      <Nav />
      <div className="pt-16">
        <header className="border-b border-linea bg-papel px-6 py-8 md:px-12">
          <p className="mb-2 font-display text-eyebrow tracking-[0.25em] text-suave">— Lo que anotaste —</p>
          <h1 className="font-display text-display-md text-tinta">
            Mis <em className="font-quote italic text-miel-800">notas</em>
          </h1>
        </header>

        <div className="mx-auto max-w-4xl px-6 py-10 md:px-12">
          {groups.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <p className="max-w-md font-body text-sm text-suave">
                Todavía no escribiste ninguna nota. Podés anotar mientras mirás cualquier lección.
              </p>
              <Link href="/panel" className="btn btn-primary">
                Volver al panel ↦
              </Link>
            </div>
          ) : (
            <div className="space-y-10">
              {groups.map((g) => (
                <section key={g.courseId} aria-labelledby={`curso-${g.courseId}`}>
                  <div className="mb-4 flex flex-wrap items-baseline gap-3">
                    <h2 id={`curso-${g.courseId}`} className="font-display text-lg tracking-wide text-tinta">
                      {g.title}
                    </h2>
                    {!g.hasAccess && (
                      <span className="font-display text-eyebrow tracking-wide text-suave">Sin acceso al curso</span>
                    )}
                  </div>
                  <div className="space-y-6">
                    {g.modules.map((m) => (
                      <div key={m.position}>
                        <h3 className="mb-2 font-display text-eyebrow tracking-wide text-miel-800 uppercase">{m.title}</h3>
                        <div className="space-y-4">
                          {m.lessons.map((l) => (
                            <article key={l.lessonId} className="tarjeta p-5">
                              <h4 className="mb-3 font-display text-base tracking-wide text-tinta">{l.title}</h4>
                              <ul className="space-y-3">
                                {l.notes.map((n) => (
                                  <li key={n.id} className="flex gap-4">
                                    {n.href ? (
                                      <Link
                                        href={n.href}
                                        aria-label={`Ir al minuto ${formatClock(n.atSeconds)} de ${l.title}`}
                                        className="flex-none font-display text-eyebrow tracking-wide text-bosque hover:text-miel-800 transition-colors"
                                      >
                                        {formatClock(n.atSeconds)}
                                      </Link>
                                    ) : (
                                      <span className="flex-none font-display text-eyebrow tracking-wide text-suave">
                                        {formatClock(n.atSeconds)}
                                      </span>
                                    )}
                                    <p className="whitespace-pre-wrap font-body text-sm text-suave">{n.body}</p>
                                  </li>
                                ))}
                              </ul>
                            </article>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
