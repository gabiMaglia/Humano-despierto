"use client";

import { useYouTubePlayer } from "@/components/player/useYouTubePlayer";

// El adelanto es material de venta: no hay progreso que guardar ni sesion que exigir.
const noProgress = () => {};

interface Props {
  videoId: string;
  title: string;
}

/** Mismo embed que el player de lecciones (IFrame API, `title` accesible), sin progreso ni notas. */
export default function PromoVideo({ videoId, title }: Props) {
  const containerId = `promo-${videoId}`;
  useYouTubePlayer(containerId, videoId, 0, 0, noProgress, title);

  return (
    <div className="relative aspect-video overflow-hidden rounded-md border border-linea">
      <div id={containerId} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
