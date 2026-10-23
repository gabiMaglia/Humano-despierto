import { ButtonLink, buttonClass } from "@/components/atoms/Button";
import ProgressBar from "@/components/atoms/ProgressBar";
import Icon from "@/components/atoms/Icon";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import type { DashboardCourse } from "@/lib/server/enrollment";

interface Props {
  course: DashboardCourse;
  /** Código de certificado ya emitido; solo se pasa para cursos al 100%. */
  certificateCode?: string;
}

/** Una fila de "Mi aprendizaje": curso inscripto con su progreso. */
export default function LearningCourseRow({ course: c, certificateCode }: Props) {
  const done = c.progressPercent === 100;
  return (
    // Completado se dice con fondo y etiqueta, no con opacidad (QA T-060 D2).
    <article
      aria-labelledby={`curso-${c.courseId}`}
      className={`tarjeta grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-center md:gap-6 md:p-6 ${done ? "bg-salvia-100" : ""}`}
    >
      <div className="min-w-0">
        <p className="mb-1 text-sm font-semibold text-miel-800">
          {c.discipline} · {c.teacherName}
        </p>
        <h3 id={`curso-${c.courseId}`} className="text-lg">
          {c.title}
        </h3>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-suave">
          {done && (
            <span className="inline-flex items-center gap-1 rounded-pill bg-papel px-2.5 py-0.5 text-xs font-semibold text-exito">
              <Icon name="check" className="h-3.5 w-3.5" />
              Completado
            </span>
          )}
          <span>
            {c.completedLessons}/{c.totalLessons} lecciones
          </span>
          {c.lastSeenAt && <span>· {formatRelativeTime(c.lastSeenAt)}</span>}
        </p>
      </div>
      <ProgressBar value={c.progressPercent} label={`Avance en ${c.title}`} />
      <div className="flex flex-wrap gap-2 md:justify-end">
        {!done && c.continueLessonId && (
          <ButtonLink href={`/leccion/${c.continueLessonId}`} size="sm" variant="outline" arrow>
            Continuar
          </ButtonLink>
        )}
        {done && certificateCode && (
          <a
            href={`/certificado/${certificateCode}`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass({ variant: "secondary", size: "sm" })}
          >
            Ver certificado
          </a>
        )}
      </div>
    </article>
  );
}
