import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { CourseOgCard, OG_SIZE } from "@/lib/og/brand";
import { getCourseOgData, loadCoverForOg } from "@/lib/server/course-og";
import { loadOgFonts } from "@/lib/server/og-fonts";

export const alt = "Curso de Humano Despierto";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await getCourseOgData(slug);
  // Inexistente o no publicado: 404, nunca una imagen vacia.
  if (!course) notFound();
  const [cover, fonts] = await Promise.all([loadCoverForOg(course.coverPath), loadOgFonts()]);
  return new ImageResponse(<CourseOgCard course={course} cover={cover} />, {
    ...size,
    fonts,
    // La portada o el titulo cambian; un año inmutable (default de next/og) los congelaria.
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
