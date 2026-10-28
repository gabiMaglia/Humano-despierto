import Link from "next/link";
import { cn } from "@/lib/utils/cn";

/** Marca: brote de línea + nombre. Hereda el color del contenedor (blanco sobre hero/footer). */
export default function BrandMark({ className, onClick }: { className?: string; onClick?: () => void }) {
  return (
    <Link
      href="/"
      onClick={onClick}
      aria-label="Humano Despierto, inicio"
      className={cn("flex items-center gap-2.5 text-[19px] font-bold tracking-[-0.01em]", className)}
    >
      <svg viewBox="0 0 34 34" className="h-8 w-8 flex-none" fill="none" stroke="currentColor" strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17 30V16" />
        <path d="M17 20c-6 0-9-4-9-10 6 0 9 4 9 10z" />
        <path d="M17 16c0-6 4-9 10-9 0 6-4 9-10 9z" />
      </svg>
      <span>Humano Despierto</span>
    </Link>
  );
}
