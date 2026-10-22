"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { fullNameSchema } from "@/lib/validation/profile";
import { AUTH_COPY, authErrorMessage } from "@/lib/auth/messages";
import { DEFAULT_NEXT, RECOVER_PATH, callbackUrl, needsDocumentNavigation } from "@/lib/auth/paths";
import AuthField from "@/components/molecules/AuthField";
import SubmitButton from "@/components/atoms/SubmitButton";
import { postLoginDestinationAction } from "./actions";
import GoogleButton from "./GoogleButton";
import { PLACEHOLDER_PHOTOS, unsplashUrl } from "@/content/placeholder-photos";

// PLACEHOLDER (ADR-015): foto de muestra en el panel derecho, donde antes estaba el canvas three.js.
// T-062 decide la imagen definitiva.
const LOGIN_PHOTO = PLACEHOLDER_PHOTOS.find((p) => p.id === "1470252649378-9c29740c9fa8")!;

type Tab = "entrar" | "registro";

interface Props {
  // Ya saneado en el servidor; `null` si faltaba o no era interno (el destino sale del rol).
  next: string | null;
  linkError: boolean;
}

export default function EntrarForm({ next, linkError }: Props) {
  const [tab, setTab] = useState<Tab>("entrar");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(linkError ? AUTH_COPY.linkExpired : null);
  const [sent, setSent] = useState(false);

  const router = useRouter();

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
      if (needsDocumentNavigation(destination)) {
        window.location.assign(destination);
        return;
      }
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
      <div className="flex w-full flex-col justify-center bg-papel px-8 py-6 md:px-14 lg:max-w-[520px]">


        {sent ? (
          <div role="status" className="space-y-4">
            <h1 className="mb-1.5 font-display text-2xl tracking-wide text-tinta">
              Revisá tu <em className="font-quote italic text-miel-800 normal-case">mail</em>
            </h1>
            <p className="font-body text-sm text-suave">{AUTH_COPY.checkEmail}</p>
            <button
              type="button"
              onClick={() => {
                setSent(false);
                setTab("entrar");
              }}
              className="text-miel-800 transition-colors hover:text-miel-800 font-body text-xs"
            >
              Volver a entrar
            </button>
          </div>
        ) : (
          <>
          {/* Tab toggle */}
          <div className="mb-5 flex rounded-pill border border-linea bg-papel p-1">
            {(["entrar", "registro"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 rounded-pill py-2 font-display text-eyebrow tracking-wide transition-colors ${
                  tab === t ? "bg-salvia-100 text-tinta" : "text-suave hover:text-suave"
                }`}
              >
                {t === "entrar" ? "Entrar" : "Crear cuenta"}
              </button>
            ))}
          </div>

          {/* Heading */}
          <div className="mb-5">
            <h1 className="mb-1.5 font-display text-2xl tracking-wide text-tinta">
              {tab === "entrar" ? (
                <>Bienvenida <em className="font-quote italic text-miel-800 normal-case">de nuevo</em></>
              ) : (
                <>Empezá tu <em className="font-quote italic text-miel-800 normal-case">camino</em></>
              )}
            </h1>
            <p className="font-body text-sm text-suave">
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
                    className="font-display text-eyebrow tracking-wide text-suave transition-colors hover:text-bosque"
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
            <div className="h-px flex-1 bg-salvia" />
            <span className="font-display text-eyebrow tracking-wide text-suave">o continuá con</span>
            <div className="h-px flex-1 bg-salvia" />
          </div>

          <GoogleButton next={next} disabled={loading} onError={setError} />

          {/* Footer note */}
          <p className="mt-5 text-center font-body text-xs text-suave">
            {tab === "entrar" ? (
              <>¿No tenés cuenta?{" "}
                <button onClick={() => setTab("registro")} className="text-miel-800 hover:text-miel-800 transition-colors">
                  Registrate
                </button>
              </>
            ) : (
              <>¿Ya tenés cuenta?{" "}
                <button onClick={() => setTab("entrar")} className="text-miel-800 hover:text-miel-800 transition-colors">
                  Ingresá
                </button>
              </>
            )}
          </p>
          </>
        )}
      </div>

      {/* ── Derecha — foto ─────────────────────────────────────────────── */}
      <div className="relative hidden flex-1 overflow-hidden bg-salvia lg:block">
        <Image
          src={unsplashUrl(LOGIN_PHOTO.id)}
          alt={LOGIN_PHOTO.alt}
          fill
          sizes="50vw"
          preload
          className="object-cover"
        />
      </div>

    </div>
  );
}
