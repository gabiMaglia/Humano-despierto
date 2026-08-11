import Link from "next/link";
import CourseCard from "@/components/molecules/CourseCard";
import SectionHeader from "@/components/atoms/SectionHeader";
import { getPublishedCourses } from "@/lib/server/courses";
import { formatPriceCents } from "@/lib/utils/format";

export default async function FeaturedCourses() {
  const courses = await getPublishedCourses();
  const featured = courses.filter((c) => c.featured).slice(0, 3);

  return (
    <section className="px-6 py-24 md:px-12">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow="Recorridos abiertos"
          title="El compendio"
          titleEm="vivo"
          subtitle="Todos disponibles desde el primer día. El aprendizaje sigue tu propio ritmo."
        />
        <div className="grid gap-6 md:grid-cols-3">
          {featured.map((course) => (
            <CourseCard
              key={course.slug}
              num={course.romanNum ?? ""}
              tag={course.discipline}
              level={course.level}
              title={course.title}
              titleEm={course.titleEm ?? undefined}
              desc={course.desc ?? ""}
              teacher={course.teacherName}
              price={formatPriceCents(course.priceCents, course.currency)}
              moon={course.moonGlyph ?? undefined}
              featured={course.featured}
              slug={course.slug}
            />
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link href="/cursos" className="btn-ritual btn-ritual-ghost rounded-pill">
            Ver todos los cursos ↦
          </Link>
        </div>
      </div>
    </section>
  );
}
