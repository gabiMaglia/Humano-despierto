"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { fullNameSchema } from "@/lib/validation/profile";
import { AUTH_COPY, authErrorMessage } from "@/lib/auth/messages";
import { DEFAULT_NEXT, RECOVER_PATH, callbackUrl } from "@/lib/auth/paths";
import AuthBrand from "@/components/molecules/AuthBrand";
import AuthField from "@/components/molecules/AuthField";
import SubmitButton from "@/components/atoms/SubmitButton";
import { postLoginDestinationAction } from "./actions";
import GoogleButton from "./GoogleButton";
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

interface Props {
  // Ya saneado en el servidor; `null` si faltaba o no era interno (el destino sale del rol).
  next: string | null;
  linkError: boolean;
}

export default function EntrarForm({ next, linkError }: Props) {
  const [tab, setTab] = useState<Tab>("entrar");
  // Fijo en SSR y en el primer render del cliente (hidratan igual); recién
  // después de montar se sortea. Sortear en el useState inicial rompía la
  // hidratación (server/client HTML distinto) y React remontaba todo el
  // árbol del formulario, borrando lo que la persona ya había tecleado.
  const [solidInfo, setSolidInfo] = useState(SOLIDS[0]);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(linkError ? AUTH_COPY.linkExpired : null);
  const [sent, setSent] = useState(false);

  const router = useRouter();

  useEffect(() => {
    // Un solo set, ligado a mount ([]), no hay cascada: es el patrón
    // documentado de React para "solo aleatorio en el cliente".
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSolidInfo(SOLIDS[Math.floor(Math.random() * SOLIDS.length)]);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    // El CHECK de la DB alcanza a `profiles.full_name` (ADR-009), porque es texto
    // libre visible en el catálogo público. Sin este espejo, un nombre rechazado
    // llega como un error crudo de Postgres en vez de un mensaje.
    if (tab !== "entrar") {
      const nombreOk = fullNameSchema.safeParse(nombre);
      if (!nombreOk.success) {
        setLoading(false);
        setError(nombreOk.error.issues[0].message);
        return;
      }
    }

    if (tab === "entrar") {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setLoading(false);
        setError(authErrorMessage(authError));
        return;
      }
      // Si la acción falla la sesión ya existe: /panel es el destino seguro para cualquier rol.
      const destination = await postLoginDestinationAction(next).catch(() => DEFAULT_NEXT);
      router.push(destination);
      router.refresh();
      return;
    }

    // Con confirmaciones activas (D8) `signUp` no deja sesión: la crea /auth/callback al abrir el
    // link, y ahí sale la bienvenida. Un mail ya registrado también llega acá sin error (GoTrue lo
    // ofusca), así que la pantalla es la misma en los dos casos.
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: nombre },
        emailRedirectTo: callbackUrl(window.location.origin, next),
      },
    });
    setLoading(false);
    if (authError) {
      setError(authErrorMessage(authError));
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex h-full">

      {/* ── Left — Form ────────────────────────────────────────────────── */}
      <div className="flex w-full flex-col justify-center bg-cosmos-surface px-8 py-6 md:px-14 lg:max-w-[520px]">

        <AuthBrand />

        {sent ? (
          <div role="status" className="space-y-4">
            <h1 className="mb-1.5 font-display text-2xl tracking-wide text-ink">
              Revisá tu <em className="font-quote italic text-lila-300 normal-case">mail</em>
            </h1>
            <p className="font-body text-sm text-ink-faint">{AUTH_COPY.checkEmail}</p>
            <button
              type="button"
              onClick={() => {
                setSent(false);
                setTab("entrar");
              }}
              className="text-lila-300 transition-colors hover:text-gold-400 font-body text-xs"
            >
              Volver a entrar
            </button>
          </div>
        ) : (
          <>
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
          {/* `method="post"` no lo usa nadie mientras haya JS: `handleSubmit` hace preventDefault
              y el login va por Supabase. Está por lo que pasa si el JS NO carga — un chunk que
              falla, una extensión, una red que corta. En ese caso el navegador hace el envío
              nativo, que por defecto es GET, y un GET pone los campos en la URL: historial,
              logs del servidor y cabecera Referer.
              Hoy no se filtra nada porque los inputs son controlados y no tienen `name`, así que
              no se serializa ninguno — lo verifiqué con el JS deshabilitado y la URL queda en
              `/entrar?` vacía. Pero eso es un accidente afortunado, no una defensa: alcanza con
              que alguien agregue `name="password"` para autocompletado y la contraseña empieza a
              viajar en la query. Con POST, ese día el peor caso es un 405, no una credencial en
              el historial del navegador. */}
          <form onSubmit={handleSubmit} method="post" className="space-y-4">
            {tab === "registro" && (
              <AuthField
                id="entrar-nombre"
                label="Nombre"
                type="text"
                autoComplete="name"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre"
              />
            )}

            <AuthField
              id="entrar-email"
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
            />

            <AuthField
              id="entrar-clave"
              label="Contraseña"
              type="password"
              autoComplete={tab === "entrar" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              aside={
                tab === "entrar" && (
                  <Link
                    href={RECOVER_PATH}
                    className="font-display text-eyebrow tracking-cosmic text-ink-faint transition-colors hover:text-lila-300"
                  >
                    ¿Olvidaste la clave?
                  </Link>
                )
              }
            />

            {error && (
              <p role="alert" className="font-body text-xs text-red-400">
                {error}
              </p>
            )}

            <SubmitButton loading={loading} label={tab === "entrar" ? "Ingresar" : "Crear cuenta"} />
          </form>

          {/* Divider */}
          <div className="my-4 flex items-center gap-4">
            <div className="h-px flex-1 bg-lila-300/18" />
            <span className="font-display text-eyebrow tracking-cosmic text-ink-faint">o continuá con</span>
            <div className="h-px flex-1 bg-lila-300/18" />
          </div>

          <GoogleButton next={next} disabled={loading} onError={setError} />

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
          </>
        )}
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
