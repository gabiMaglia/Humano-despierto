import { notFound } from "next/navigation";
import { getLessonPlayerData } from "@/lib/server/lesson-player";
import LessonPlayer from "@/components/player/LessonPlayer";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Server Component: verifica acceso (inscripción activa o `is_preview`, ADR-003) y resuelve
// `video_id` con service_role ANTES de renderizar nada — T-006 c.2/c.3. Sin permiso, `notFound()`
// sin distinguir "no existe" de "no tenés acceso": la misma respuesta para las dos, nada que
// confirmar desde afuera.
export default async function LeccionPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getLessonPlayerData(id);

  if (!data) notFound();

  return <LessonPlayer data={data} />;
}
