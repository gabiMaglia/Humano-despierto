import CourseCard from "@/components/molecules/CourseCard";
import SectionHeader from "@/components/atoms/SectionHeader";
import { COURSES } from "@/lib/mocks/landing";

export default function FeaturedCourses() {
  return (
    <section className="px-6 py-24 md:px-12">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow="Cursos en cohorte abierta"
          title="El compendio"
          titleEm="vivo"
          subtitle="Cada cohorte abre con la luna nueva. El aprendizaje sigue el ritmo del cielo."
        />
        <div className="grid gap-6 md:grid-cols-3">
          {COURSES.map((course) => (
            <CourseCard key={course.slug} {...course} weeks={course.weeks} />
          ))}
        </div>
        <div className="mt-12 text-center">
          <a href="/cursos" className="btn-ritual btn-ritual-ghost rounded-pill">
            Ver todos los cursos ↦
          </a>
        </div>
      </div>
    </section>
  );
}
