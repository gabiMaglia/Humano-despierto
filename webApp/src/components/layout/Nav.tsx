"use client";

import Link from "next/link";
import { useAuthStore } from "@/lib/stores/useAuthStore";

const NAV_LINKS = [
  { label: "Cursos",  href: "/cursos"  },
  { label: "Guías",   href: "/guias"   },
  { label: "Círculo", href: "/circulo", hidden: true },
];

export default function Nav() {
  const { isSignedIn, user, signOut } = useAuthStore();

  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-lila-300/20 bg-cosmos-0/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 md:px-10 py-3.5">

        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5">
          <svg viewBox="0 0 24 24" className="h-5 w-5 flex-none stroke-lila-300 fill-none" strokeWidth={1} aria-hidden>
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

        {/* Links */}
        <div className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map(({ label, href, hidden }) => (
            <Link
              key={label}
              href={href}
              className={`font-display text-eyebrow tracking-cosmic text-ink-soft transition-colors hover:text-ink${hidden ? " hidden xl:block" : ""}`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center gap-2.5">
          {isSignedIn ? (
            <>
              <Link
                href="/panel"
                className="hidden md:flex items-center gap-2 font-display text-eyebrow tracking-cosmic text-ink-soft hover:text-lila-300 transition-colors"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-lila-300/40 bg-lila-300/10 text-sm text-lila-300">
                  {user?.glyph}
                </span>
                <span>{user?.name}</span>
              </Link>
              <button
                onClick={signOut}
                className="font-display text-eyebrow tracking-cosmic text-ink-faint hover:text-gold-400 transition-colors"
              >
                Salir
              </button>
            </>
          ) : (
            <>
              <Link
                href="/entrar"
                className="hidden font-display text-eyebrow tracking-cosmic text-ink-soft transition-colors hover:text-lila-300 md:block"
              >
                Entrar
              </Link>
              <Link href="/entrar" className="btn-ritual btn-ritual-ghost hidden rounded-pill md:inline-flex">
                Inscribirme
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
