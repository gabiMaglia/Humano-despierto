import { notFound } from "next/navigation";
import { getLessonPlayerData } from "@/lib/server/lesson-player";
import { parseStartSeconds } from "@/lib/player/navigation";
import LessonPlayer from "@/components/player/LessonPlayer";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Server Component: verifica acceso (inscripción activa o `is_preview`, ADR-003) y resuelve
// `video_id` con service_role ANTES de renderizar nada — T-006 c.2/c.3. Sin permiso, `notFound()`
// sin distinguir "no existe" de "no tenés acceso": la misma respuesta para las dos, nada que
// confirmar desde afuera.
export default async function LeccionPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { t } = await searchParams;
  const data = await getLessonPlayerData(id);

  if (!data) notFound();

  // `?t=` (T-045 c.8) gana sobre el progreso guardado: es un link a un momento concreto.
  const startSeconds = parseStartSeconds(t, data.durationSeconds);

  return <LessonPlayer data={data} startSeconds={startSeconds} />;
}
