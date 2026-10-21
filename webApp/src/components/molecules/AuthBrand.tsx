import Link from "next/link";

export default function AuthBrand() {
  return (
    <Link href="/" className="mb-8 flex items-center gap-2.5">
      <svg viewBox="0 0 24 24" className="h-5 w-5 flex-none fill-none stroke-lila-300" strokeWidth={1} aria-hidden>
        <circle cx={12} cy={12} r={10} />
        <path d="M12 2 L12 22 M2 12 L22 12 M5 5 L19 19 M19 5 L5 19" />
        <circle cx={12} cy={12} r={3} fill="currentColor" className="text-lila-300" />
      </svg>
      <div className="flex flex-col leading-none">
        <span className="font-display text-[13px] tracking-[0.22em] text-ink uppercase">
          Humano{" "}
          <span className="font-quote italic text-lila-300 normal-case tracking-normal">Despierto</span>
        </span>
        <span className="font-body text-[7px] tracking-[0.2em] text-ink-faint uppercase mt-0.5">
          Escuela holística
        </span>
      </div>
    </Link>
  );
}
