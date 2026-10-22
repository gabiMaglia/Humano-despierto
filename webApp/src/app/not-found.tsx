import Link from "next/link";
import Starfield from "@/components/cosmos/Starfield";

// Sin metadata propia (not-found.tsx no la acepta): el noindex lo inyecta Next en todo 404.
// 404 real solo mientras ningun loading.tsx arriba empiece a streamear antes (C-01).
export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-4 overflow-hidden bg-cosmos-0 px-6 text-center text-ink">
      <Starfield />
      <span className="relative text-4xl text-lila-300" aria-hidden>
        ✧
      </span>
      <p className="relative font-display text-eyebrow tracking-cosmic text-gold-400">✧ Este camino no existe</p>
      <h1 className="relative max-w-md font-display text-display-md text-ink">
        La página que buscás <em className="font-quote italic text-lila-300">no está</em> en este cielo
      </h1>
      <p className="relative max-w-md font-body text-sm text-ink-soft">
        Puede que el enlace haya cambiado o que el curso ya no esté publicado.
      </p>
      <div className="relative mt-2 flex flex-wrap items-center justify-center gap-3">
        <Link href="/cursos" className="btn-ritual btn-ritual-primary rounded-pill">
          Ver los cursos
        </Link>
        <Link href="/" className="btn-ritual btn-ritual-ghost rounded-pill">
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
