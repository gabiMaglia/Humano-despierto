import Link from "next/link";
import RequestEnrollmentButton from "@/components/course/RequestEnrollmentButton";
import type { StudentEnrollmentState } from "@/lib/server/enrollment";
import { formatCertificateDate } from "@/lib/utils/format";

function Estado({ title, detail }: { title: string; detail?: string | null }) {
  return (
    <div className="text-center">
      <p className="font-display text-eyebrow tracking-cosmic text-lila-300">{title}</p>
      {detail && <p className="mt-2 font-quote italic text-sm text-ink-soft">{detail}</p>}
    </div>
  );
}

/** T-043 · un CTA por estado. Sin sesión es un link (el login vuelve a esta ficha con `next`);
 *  con sesión y sin fila es la action; el resto informa y no ofrece botón. */
export default function EnrollmentCta({ slug, state }: { slug: string; state: StudentEnrollmentState }) {
  switch (state.status) {
    case "anonymous":
      return (
        <Link
          href={`/entrar?next=${encodeURIComponent(`/cursos/${slug}`)}`}
          className="btn-ritual btn-ritual-primary w-full rounded-pill justify-center"
        >
          Solicitar inscripción ↦
        </Link>
      );
    case "none":
      return <RequestEnrollmentButton slug={slug} />;
    case "requested":
      return (
        <Estado
          title="Solicitud enviada"
          detail={`La enviaste el ${formatCertificateDate(state.requestedAt)}. Te avisamos por mail cuando la escuela la revise.`}
        />
      );
    case "active":
      return (
        <div className="space-y-3 text-center">
          <Estado title="Ya estás inscripta" />
          <Link href="/panel" className="btn-ritual btn-ritual-primary w-full rounded-pill justify-center">
            Ir a mi panel ↦
          </Link>
        </div>
      );
    case "revoked":
      return <Estado title="Tu inscripción fue dada de baja" />;
    case "rejected":
      return <Estado title="Solicitud no aprobada" detail={state.decidedReason} />;
  }
}
