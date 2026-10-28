import Link from "next/link";
import type { StudentRequest } from "@/lib/server/enrollment";
import { formatCertificateDate } from "@/lib/utils/format";

/** T-043 · lo pedido que todavía no se cursa. Vacía no renderiza nada: un encabezado sin filas
 *  es ruido (misma regla que T-027 c.1). */
export default function StudentRequests({ requests }: { requests: StudentRequest[] }) {
  if (requests.length === 0) return null;

  return (
    <section aria-labelledby="solicitudes-enviadas">
      <h3 id="solicitudes-enviadas" className="mb-4 text-lg">
        Solicitudes enviadas
      </h3>
      <ul className="space-y-3">
        {requests.map((r) => (
          <li key={r.courseId} className="tarjeta p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link href={`/cursos/${r.slug}`} className="text-lg font-semibold text-bosque underline-offset-4 hover:underline">
                {r.title}
              </Link>
              <span
                className={
                  r.status === "requested"
                    ? "rounded-pill bg-miel-100 px-3 py-0.5 text-xs font-semibold text-miel-800"
                    : "rounded-pill bg-salvia-100 px-3 py-0.5 text-xs font-semibold text-error"
                }
              >
                {r.status === "requested" ? "En revisión" : "No aprobada"}
              </span>
            </div>
            {r.status === "requested" && (
              <p className="mt-1 text-sm text-suave">
                Enviada{r.requestedAt ? ` el ${formatCertificateDate(r.requestedAt)}` : ""} · la escuela la está revisando
              </p>
            )}
            {r.status === "rejected" && r.decidedReason && (
              <p className="mt-2 border-l-2 border-salvia pl-3 text-sm text-tinta">{r.decidedReason}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
