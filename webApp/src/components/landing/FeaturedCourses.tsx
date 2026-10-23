import Link from "next/link";
import CourseCard from "@/components/molecules/CourseCard";
import Reveal from "@/components/layout/Reveal";
import { LANDING } from "@/content/landing";
import type { DisciplineCount } from "@/lib/landing";
import type { PublishedCourseSummary } from "@/lib/server/courses";
import { formatPriceCents } from "@/lib/utils/format";

interface Props {
  courses: PublishedCourseSummary[];
  covers: Map<string, string>;
  total: number;
  disciplines: DisciplineCount[];
}

export default function FeaturedCourses({ courses, covers, total, disciplines }: Props) {
  if (courses.length === 0) return null;
  const c = LANDING.cursos;
  return (
    <section id="cursos" aria-labelledby="cursos-titulo" className="bg-salvia-100 py-[90px] md:pb-[120px] md:pt-[110px]">
      <div className="mx-auto max-w-[1200px] px-6">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <Reveal>
            <h2 id="cursos-titulo" className="text-[clamp(32px,4vw,46px)]">{c.title}</h2>
          </Reveal>
          <Reveal delay={1}>
            <p className="max-w-[38ch] text-suave">
              {c.lead}{" "}
              <Link href="/cursos" className="border-b-[1.5px] border-current font-semibold text-miel-800">
                {c.verTodos(total)}
              </Link>
            </p>
          </Reveal>
        </header>

        {disciplines.length > 0 && (
          <ul aria-label="Cursos por oficio" className="mb-10 flex flex-wrap gap-2">
            {disciplines.map((d) => (
              <li key={d.key}>
                <Link
                  href={`/cursos?disciplina=${encodeURIComponent(d.key)}`}
                  className="inline-flex min-h-10 items-center gap-2 rounded-pill border-[1.5px] border-salvia bg-papel px-4 py-2 text-sm font-medium text-bosque transition-colors hover:border-bosque"
                >
                  {d.label}
                  <span className="text-suave">{`${d.count} ${d.count === 1 ? "curso" : "cursos"}`}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course, i) => (
            <Reveal key={course.slug} delay={(i % 3) as 0 | 1 | 2}>
              <CourseCard
                tag={course.discipline}
                title={course.title}
                titleEm={course.titleEm ?? undefined}
                teacher={course.teacherName}
                price={formatPriceCents(course.priceCents, course.currency)}
                slug={course.slug}
                rating={course.rating}
                reviewCount={course.reviewCount}
                coverUrl={course.coverPath ? covers.get(course.coverPath) : undefined}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
