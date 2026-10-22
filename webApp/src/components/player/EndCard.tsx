"use client";

interface Props {
  /** Siguiente lección publicada; null en la última. */
  next: { id: string; title: string } | null;
  /** Destino del cierre cuando no hay siguiente (certificado o panel); null mientras se resuelve. */
  closingHref: string | null;
  /** Segundos que faltan para el autoplay; null si no hay cuenta regresiva en curso. */
  countdown: number | null;
  onCancel: () => void;
  onGo: (href: string) => void;
}

/** Tarjeta que cubre el video al terminar: qué sigue, con cuenta regresiva cancelable. */
export default function EndCard({ next, closingHref, countdown, onCancel, onGo }: Props) {
  const href = next ? `/leccion/${next.id}` : closingHref;
  const label = next ? `Siguiente: ${next.title}` : "Terminaste el curso";

  return (
    <div
      role="status"
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-papel px-5 text-center"
    >
      {!next && <p className="font-display text-sm tracking-wide text-tinta">{label}</p>}
      {countdown !== null && (
        <p className="font-body text-xs text-suave">
          Siguiente lección en {countdown} s
          <button
            type="button"
            onClick={onCancel}
            className="ml-3 font-display text-eyebrow tracking-wide text-bosque hover:text-miel-800 transition-colors"
          >
            Cancelar
          </button>
        </p>
      )}
      {href && (
        <a
          href={href}
          onClick={(e) => {
            e.preventDefault();
            onGo(href);
          }}
          className="font-display text-eyebrow tracking-wide text-miel-800 hover:text-bosque transition-colors"
        >
          {next ? `${label} →` : "Continuar →"}
        </a>
      )}
    </div>
  );
}
