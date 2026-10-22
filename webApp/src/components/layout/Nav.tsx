"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/useAuthStore";
import { createClient } from "@/lib/supabase/client";

const NAV_LINKS = [
  { label: "Cursos",  href: "/cursos"  },
  { label: "Guías",   href: "/guias"   },
  { label: "Círculo", href: "/circulo", hidden: true },
];

export default function Nav() {
  const { isSignedIn, user } = useAuthStore();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-linea bg-papel backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 md:px-10 py-3.5">

        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5">
          <svg viewBox="0 0 24 24" className="h-5 w-5 flex-none stroke-musgo fill-none" strokeWidth={1} aria-hidden>
            <circle cx={12} cy={12} r={10} />
            <path d="M12 2 L12 22 M2 12 L22 12 M5 5 L19 19 M19 5 L5 19" />
            <circle cx={12} cy={12} r={3} fill="currentColor" className="text-miel-800" />
          </svg>
          <div className="flex flex-col leading-none">
            <span className="font-display text-[13px] tracking-[0.22em] text-tinta uppercase">
              Humano{" "}
              <span className="font-quote italic text-miel-800 normal-case tracking-normal">Despierto</span>
            </span>
            <span className="font-body text-[7px] tracking-[0.2em] text-suave uppercase mt-0.5">
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
              className={`font-display text-eyebrow tracking-wide text-suave transition-colors hover:text-tinta${hidden ? " hidden xl:block" : ""}`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center gap-2.5">
          {isSignedIn ? (
            <>
              {user?.role === "teacher" && (
                <Link
                  href="/panel/docente"
                  className="hidden font-display text-eyebrow tracking-wide text-suave transition-colors hover:text-bosque lg:block"
                >
                  Panel docente
                </Link>
              )}
              {user?.role === "admin" && (
                <Link
                  href="/panel/admin"
                  className="hidden font-display text-eyebrow tracking-wide text-suave transition-colors hover:text-bosque lg:block"
                >
                  Panel admin
                </Link>
              )}
              <Link
                href="/panel"
                className="hidden md:flex items-center gap-2 font-display text-eyebrow tracking-wide text-suave hover:text-bosque transition-colors"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-linea bg-salvia-100 text-sm text-miel-800">
                  {user?.glyph || "☉"}
                </span>
                <span>{user?.fullName || user?.email}</span>
              </Link>
              <Link
                href="/panel/perfil"
                className="font-display text-eyebrow tracking-wide text-suave transition-colors hover:text-bosque"
              >
                Mi perfil
              </Link>
              <button
                onClick={handleSignOut}
                className="font-display text-eyebrow tracking-wide text-suave hover:text-miel-800 transition-colors"
              >
                Salir
              </button>
            </>
          ) : (
            <>
              <Link
                href="/entrar"
                className="hidden font-display text-eyebrow tracking-wide text-suave transition-colors hover:text-bosque md:block"
              >
                Entrar
              </Link>
              <Link href="/entrar" className="btn btn-outline hidden md:inline-flex">
                Inscribirme
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
