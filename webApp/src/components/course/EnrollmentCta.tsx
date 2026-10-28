import { ButtonLink } from "@/components/atoms/Button";
import RequestEnrollmentButton from "@/components/course/RequestEnrollmentButton";
import type { StudentEnrollmentState } from "@/lib/server/enrollment";
import { formatCertificateDate } from "@/lib/utils/format";

function Estado({ title, detail }: { title: string; detail?: string | null }) {
  return (
    <div role="status" className="rounded-md bg-salvia-100 px-4 py-3.5">
      <p className="font-semibold text-bosque">{title}</p>
      {detail && <p className="mt-1 text-sm leading-normal text-suave">{detail}</p>}
    </div>
  );
}

/** T-043 · un CTA por estado. Sin sesión es un link (el login vuelve a esta ficha con `next`);
 *  con sesión y sin fila es la action; el resto informa y no ofrece botón. */
export default function EnrollmentCta({ slug, state }: { slug: string; state: StudentEnrollmentState }) {
  switch (state.status) {
    case "anonymous":
      return (
        <ButtonLink href={`/entrar?next=${encodeURIComponent(`/cursos/${slug}`)}`} full>
          Solicitar inscripción
        </ButtonLink>
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
      // «Ya estás inscripta» es el título del panel (D-109): acá sólo el camino.
      return (
        <ButtonLink href="/panel" full arrow>
          Ir a mi panel
        </ButtonLink>
      );
    case "revoked":
      return <Estado title="Tu inscripción fue dada de baja" />;
    case "rejected":
      return <Estado title="Solicitud no aprobada" detail={state.decidedReason} />;
  }
}
