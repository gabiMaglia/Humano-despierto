import { cn } from "@/lib/utils/cn";

/** Ilustración botánica de la maqueta B4. Decorativa; color musgo por defecto (sólo ilustración). */
export default function LeafIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 190" className={cn("h-auto w-[150px] text-musgo", className)} fill="none"
      stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden="true" focusable="false">
      <path d="M75 185V60" />
      <path d="M75 120c-30 0-48-20-50-52 30 2 48 20 50 52z" />
      <path d="M75 90c0-30 18-48 50-50-2 30-20 48-50 50z" />
      <path d="M75 150c-18 0-30-10-32-30 18 2 30 12 32 30z" />
      <path d="M30 68c10 8 20 12 32 12M126 42c-10 12-24 20-40 22" />
    </svg>
  );
}
