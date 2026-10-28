import { cn } from "@/lib/utils/cn";

export default function CardBack({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 170" role="img" aria-label="Carta boca abajo" className={cn("h-full w-full rounded-md", className)}>
      <rect width="100" height="170" rx="6" className="fill-bosque" />
      <rect x="6" y="6" width="88" height="158" rx="4" fill="none" className="stroke-miel" strokeWidth="1.5" />
      <circle cx="50" cy="85" r="22" fill="none" className="stroke-miel" strokeWidth="1" />
      <circle cx="50" cy="85" r="14" fill="none" className="stroke-salvia" strokeWidth="0.8" />
      <path d="M50 63v44M28 85h44M34.4 69.4l31.2 31.2M65.6 69.4L34.4 100.6" className="stroke-miel" strokeWidth="0.6" />
    </svg>
  );
}
