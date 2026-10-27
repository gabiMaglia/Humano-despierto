"use client";

import Button, { buttonClass } from "@/components/atoms/Button";
import Icon from "@/components/atoms/Icon";

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
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-bosque px-5 text-center"
    >
      {!next && <p className="text-xl font-semibold text-white">{label}</p>}
      {countdown !== null && (
        <p className="flex flex-wrap items-center justify-center gap-3 text-base text-salvia-100">
          Siguiente lección en {countdown} s
          <Button variant="ghost-light" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
        </p>
      )}
      {href && (
        <a
          href={href}
          onClick={(e) => {
            e.preventDefault();
            onGo(href);
          }}
          className={buttonClass({ className: "max-w-full" })}
        >
          <span className="truncate">{next ? label : "Continuar"}</span>
          <Icon name="arrow-right" className="btn-arrow" />
        </a>
      )}
    </div>
  );
}
