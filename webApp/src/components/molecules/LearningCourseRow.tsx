import Link from "next/link";
import ProgressRing from "@/components/atoms/ProgressRing";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import type { DashboardCourse } from "@/lib/server/enrollment";

interface Props {
  course: DashboardCourse;
  /** Posición para el numeral romano de respaldo cuando el curso no trae uno. */
  index: number;
  /** Código de certificado ya emitido; solo se pasa para cursos al 100%. */
  certificateCode?: string;
}

/** Una fila de "Mi aprendizaje": curso inscripto con su progreso. */
export default function LearningCourseRow({ course: c, index, certificateCode }: Props) {
  return (
    <article className={`tarjeta flex items-center gap-5 p-5 ${c.progressPercent === 100 ? "opacity-60" : ""}`}>
      <div className="flex flex-col items-center gap-1 flex-none">
        <span className="font-display text-lg tracking-wide text-bosque">{c.romanNum ?? String(index + 1)}</span>
        {c.moonGlyph && <span className="text-base">{c.moonGlyph}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display text-eyebrow tracking-wide text-miel-800 uppercase">{c.discipline} · {c.teacherName}</p>
        <h4 className="font-display text-base tracking-wide text-tinta mb-0.5">{c.title}</h4>
        <div className="mt-1 flex items-center gap-2 font-body text-xs text-suave">
          <span>{c.completedLessons}/{c.totalLessons} lecciones</span>
          {c.lastSeenAt && (
            <>
              <span className="text-miel-800">·</span>
              <span>{formatRelativeTime(c.lastSeenAt)}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex-none flex flex-col items-center gap-2">
        <ProgressRing value={c.progressPercent} />
        {c.progressPercent < 100 && c.continueLessonId && (
          <Link href={`/leccion/${c.continueLessonId}`} className="font-display text-eyebrow tracking-wide text-bosque hover:text-miel-800 transition-colors whitespace-nowrap">
            Continuar ↦
          </Link>
        )}
        {c.progressPercent === 100 && certificateCode && (
          <a
            href={`/certificado/${certificateCode}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-display text-eyebrow tracking-wide text-miel-800 hover:text-bosque transition-colors whitespace-nowrap"
          >
            Ver certificado ↦
          </a>
        )}
      </div>
    </article>
  );
}
