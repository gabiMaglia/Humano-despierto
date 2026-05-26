"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useAuthStore } from "@/lib/stores/useAuthStore";
import type { SolidType } from "@/components/cosmos/PlatonicSolid";

const PlatonicSolid = dynamic(() => import("@/components/cosmos/PlatonicSolid"), { ssr: false });

const SOLIDS: { type: SolidType; name: string; element: string; tagline: string }[] = [
  { type: "tetrahedron",  name: "Tetraedro",   element: "Fuego",  tagline: "La chispa que inicia todo camino." },
  { type: "cube",         name: "Hexaedro",     element: "Tierra", tagline: "La base sobre la que todo se construye." },
  { type: "octahedron",   name: "Octaedro",     element: "Aire",   tagline: "El movimiento que conecta cielo y tierra." },
  { type: "dodecahedron", name: "Dodecaedro",   element: "Éter",   tagline: "El quinto elemento. La forma del cosmos." },
  { type: "icosahedron",  name: "Icosaedro",    element: "Agua",   tagline: "La fluidez que moldea todo lo que toca." },
];

type Tab = "entrar" | "registro";

export default function EntrarPage() {
  const [tab, setTab] = useState<Tab>("entrar");
  const [solidInfo] = useState(() => SOLIDS[Math.floor(Math.random() * SOLIDS.length)]);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { signIn } = useAuthStore();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    signIn();
    router.push("/panel");
  }

  return (
    <div className="flex h-full">

      {/* ── Left — Form ────────────────────────────────────────────────── */}
      <div className="flex w-full flex-col justify-center bg-cosmos-surface px-8 py-6 md:px-14 lg:max-w-[520px]">

        {/* Brand */}
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

        {/* Tab toggle */}
        <div className="mb-5 flex rounded-pill border border-lila-300/20 bg-cosmos-0/40 p-1">
          {(["entrar", "registro"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-pill py-2 font-display text-eyebrow tracking-cosmic transition-colors ${
                tab === t ? "bg-lila-300/15 text-ink" : "text-ink-faint hover:text-ink-soft"
              }`}
            >
              {t === "entrar" ? "Entrar" : "Crear cuenta"}
            </button>
          ))}
        </div>

        {/* Heading */}
        <div className="mb-5">
          <h1 className="mb-1.5 font-display text-2xl tracking-wide text-ink">
            {tab === "entrar" ? (
              <>Bienvenida <em className="font-quote italic text-lila-300 normal-case">de nuevo</em></>
            ) : (
              <>Empezá tu <em className="font-quote italic text-lila-300 normal-case">camino</em></>
            )}
          </h1>
          <p className="font-body text-sm text-ink-faint">
            {tab === "entrar"
              ? "Ingresá con tu cuenta para continuar."
              : "Creá tu cuenta y accedé al círculo."}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === "registro" && (
            <div>
              <label className="mb-1.5 block font-display text-eyebrow tracking-cosmic text-ink-soft">
                Nombre
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre"
                className="w-full rounded-ritual border border-lila-300/20 bg-cosmos-0/60 px-4 py-3 font-body text-sm text-ink placeholder:text-ink-faint outline-none transition-colors focus:border-lila-300/50 focus:bg-cosmos-0"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block font-display text-eyebrow tracking-cosmic text-ink-soft">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full rounded-ritual border border-lila-300/20 bg-cosmos-0/60 px-4 py-3 font-body text-sm text-ink placeholder:text-ink-faint outline-none transition-colors focus:border-lila-300/50 focus:bg-cosmos-0"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="font-display text-eyebrow tracking-cosmic text-ink-soft">
                Contraseña
              </label>
              {tab === "entrar" && (
                <span className="cursor-pointer font-display text-eyebrow tracking-cosmic text-ink-faint transition-colors hover:text-lila-300">
                  ¿Olvidaste la clave?
                </span>
              )}
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-ritual border border-lila-300/20 bg-cosmos-0/60 px-4 py-3 font-body text-sm text-ink placeholder:text-ink-faint outline-none transition-colors focus:border-lila-300/50 focus:bg-cosmos-0"
            />
          </div>

          <button
            type="submit"
            className="btn-ritual btn-ritual-primary mt-2 w-full rounded-ritual"
          >
            {tab === "entrar" ? "Ingresar" : "Crear cuenta"}
          </button>
        </form>

        {/* Divider */}
        <div className="my-4 flex items-center gap-4">
          <div className="h-px flex-1 bg-lila-300/18" />
          <span className="font-display text-eyebrow tracking-cosmic text-ink-faint">o continuá con</span>
          <div className="h-px flex-1 bg-lila-300/18" />
        </div>

        {/* Google OAuth placeholder */}
        <button
          onClick={handleSubmit}
          className="btn-ritual btn-ritual-ghost flex w-full items-center justify-center gap-3 rounded-ritual"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 flex-none" aria-hidden>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuar con Google
        </button>

        {/* Footer note */}
        <p className="mt-5 text-center font-body text-xs text-ink-faint">
          {tab === "entrar" ? (
            <>¿No tenés cuenta?{" "}
              <button onClick={() => setTab("registro")} className="text-lila-300 hover:text-gold-400 transition-colors">
                Registrate
              </button>
            </>
          ) : (
            <>¿Ya tenés cuenta?{" "}
              <button onClick={() => setTab("entrar")} className="text-lila-300 hover:text-gold-400 transition-colors">
                Ingresá
              </button>
            </>
          )}
        </p>
      </div>

      {/* ── Right — Platonic solid ──────────────────────────────────────── */}
      <div
        className="relative hidden flex-1 flex-col items-center justify-center overflow-hidden lg:flex"
        style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(196,181,253,0.08) 0%, transparent 65%), #0a0418" }}
      >
        {/* Glow behind the solid */}
        <div
          className="pointer-events-none absolute inset-[20%] rounded-full blur-[80px]"
          style={{ background: "radial-gradient(ellipse, rgba(196,181,253,0.18) 0%, transparent 70%)" }}
        />

        {/* Three.js canvas — fills the panel */}
        <div className="absolute inset-0">
          <PlatonicSolid solid={solidInfo.type} />
        </div>

        {/* Floating sigils */}
        {[
          { icon: "✦", cls: "top-12 left-[14%] text-gold-400 text-xs opacity-50" },
          { icon: "☉", cls: "top-[28%] right-[10%] text-lila-300 text-sm opacity-35" },
          { icon: "◐", cls: "bottom-[28%] left-[8%]  text-lila-300 text-xs opacity-35" },
          { icon: "✧", cls: "bottom-12 right-[16%] text-gold-400 text-[10px] opacity-45" },
        ].map(({ icon, cls }) => (
          <span key={icon} className={`pointer-events-none absolute font-display ${cls}`}>{icon}</span>
        ))}

        {/* Label — changes with each random solid */}
        <div className="absolute bottom-10 left-0 right-0 text-center">
          <p className="mb-1 font-display text-eyebrow tracking-cosmic text-ink-faint">
            {solidInfo.name} · {solidInfo.element}
          </p>
          <p className="font-quote italic text-sm text-ink-faint/60">{solidInfo.tagline}</p>
        </div>
      </div>

    </div>
  );
}
