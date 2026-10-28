import Link from "next/link";
import TeacherPortrait from "@/components/atoms/TeacherPortrait";
import type { PublicTeacherCard } from "@/lib/server/guias";

/** Tarjeta de guía (B1): retrato 4:5, nombre, oficio y una línea. Toda la tarjeta es el link. */
export default function GuiaCard({
  slug, fullName, headline, location, coursesCount, discipline, avatarUrl,
}: PublicTeacherCard & { avatarUrl?: string | null }) {
  return (
    <article className="group relative">
      <TeacherPortrait name={fullName} src={avatarUrl} className="mb-4 aspect-[4/5] w-full rounded-lg" />
      <h2 className="text-xl">
        <Link href={`/guias/${slug}`} className="after:absolute after:inset-0 group-hover:text-miel-800">
          {fullName}
        </Link>
      </h2>
      {discipline && <p className="mb-2 mt-0.5 text-sm font-semibold text-miel-800">{discipline}</p>}
      {headline && <p className="text-[15px] leading-normal text-suave">{headline}</p>}
      <p className="mt-2 text-sm text-suave">
        {coursesCount} {coursesCount === 1 ? "curso" : "cursos"}
        {location && <> · {location}</>}
      </p>
    </article>
  );
}
