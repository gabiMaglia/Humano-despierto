import Link from "next/link";
import type { StudentRequest } from "@/lib/server/enrollment";
import { formatCertificateDate } from "@/lib/utils/format";

/** T-043 · lo pedido que todavía no se cursa. Vacía no renderiza nada: un encabezado sin filas
 *  es ruido (misma regla que T-027 c.1). */
export default function StudentRequests({ requests }: { requests: StudentRequest[] }) {
  if (requests.length === 0) return null;

  return (
    <section aria-labelledby="solicitudes-enviadas" className="mx-auto max-w-4xl px-6 pt-10 md:px-12">
      <h2 id="solicitudes-enviadas" className="mb-5 font-display text-lg tracking-wide text-ink">
        Solicitudes enviadas
      </h2>
      <ul className="space-y-3">
        {requests.map((r) => (
          <li key={r.courseId} className="cosmos-card p-4">
            <Link
              href={`/cursos/${r.slug}`}
              className="font-display text-sm tracking-wide text-ink transition-colors hover:text-lila-300"
            >
              {r.title}
            </Link>
            <p className="font-body text-xs text-ink-faint">
              {r.status === "requested"
                ? `Enviada${r.requestedAt ? ` el ${formatCertificateDate(r.requestedAt)}` : ""} · la escuela la está revisando`
                : "No aprobada"}
            </p>
            {r.status === "rejected" && r.decidedReason && (
              <p className="mt-1 font-quote italic text-sm text-ink-soft">{r.decidedReason}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
