import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/atoms/Button";
import SiteHeader from "@/components/layout/SiteHeader";
import AppPageHeader from "@/components/layout/AppPageHeader";
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
      <SiteHeader />
      <AppPageHeader
        eyebrow="Lo que anotaste"
        title="Mis notas"
        subtitle="Cada nota guarda el minuto del video: tocalo para volver a ese momento de la lección."
      />

      <main className="mx-auto max-w-[1200px] px-6 py-12">
        {groups.length === 0 ? (
          <div className="tarjeta flex flex-col items-start gap-4 p-8">
            <p className="max-w-[46ch] text-base text-tinta">
              Todavía no escribiste ninguna nota. Podés anotar mientras mirás cualquier lección.
            </p>
            <ButtonLink href="/panel" variant="outline" size="sm">
              Volver al panel
            </ButtonLink>
          </div>
        ) : (
          <div className="space-y-14">
            {groups.map((g) => (
              <section key={g.courseId} aria-labelledby={`curso-${g.courseId}`}>
                <div className="mb-6 flex flex-wrap items-center gap-3 border-b border-linea pb-3">
                  <h2 id={`curso-${g.courseId}`} className="text-2xl">
                    {g.title}
                  </h2>
                  {!g.hasAccess && (
                    <span className="rounded-pill bg-salvia-100 px-3 py-0.5 text-xs font-semibold text-bosque">
                      Sin acceso al curso
                    </span>
                  )}
                </div>
                <div className="space-y-8">
                  {g.modules.map((m) => (
                    <div key={m.position}>
                      <h3 className="mb-3 text-sm font-semibold text-miel-800">{m.title}</h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        {m.lessons.map((l) => (
                          <article key={l.lessonId} className="tarjeta p-5">
                            <h4 className="mb-3 text-base">{l.title}</h4>
                            <ul className="divide-y divide-linea">
                              {l.notes.map((n) => (
                                <li key={n.id} className="flex gap-4 py-3 first:pt-0 last:pb-0">
                                  {n.href ? (
                                    <Link
                                      href={n.href}
                                      aria-label={`Ir al minuto ${formatClock(n.atSeconds)} de ${l.title}`}
                                      className="inline-flex h-8 min-w-14 flex-none items-center justify-center rounded-pill bg-miel-100 px-2.5 text-sm font-semibold tabular-nums text-miel-800 transition-colors hover:bg-miel hover:text-bosque"
                                    >
                                      {formatClock(n.atSeconds)}
                                    </Link>
                                  ) : (
                                    <span className="inline-flex h-8 min-w-14 flex-none items-center justify-center rounded-pill bg-salvia-100 px-2.5 text-sm font-semibold tabular-nums text-bosque">
                                      {formatClock(n.atSeconds)}
                                    </span>
                                  )}
                                  <p className="whitespace-pre-wrap text-base text-tinta">{n.body}</p>
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
      </main>
    </div>
  );
}
