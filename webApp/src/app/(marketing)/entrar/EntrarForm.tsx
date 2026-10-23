"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { fullNameSchema } from "@/lib/validation/profile";
import { AUTH_COPY, authErrorMessage } from "@/lib/auth/messages";
import { DEFAULT_NEXT, RECOVER_PATH, callbackUrl, needsDocumentNavigation } from "@/lib/auth/paths";
import AuthField from "@/components/molecules/AuthField";
import AuthFrame from "@/components/molecules/AuthFrame";
import { AuthHeading } from "@/components/molecules/AuthShell";
import Button from "@/components/atoms/Button";
import ErrorMark from "@/components/atoms/ErrorMark";
import SubmitButton from "@/components/atoms/SubmitButton";
import { postLoginDestinationAction } from "./actions";
import GoogleButton from "./GoogleButton";

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
  const [nombreError, setNombreError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNombreError(null);
    setLoading(true);

    const supabase = createClient();

    // El CHECK de la DB alcanza a `profiles.full_name` (ADR-009), porque es texto
    // libre visible en el catálogo público. Sin este espejo, un nombre rechazado
    // llega como un error crudo de Postgres en vez de un mensaje.
    if (tab !== "entrar") {
      const nombreOk = fullNameSchema.safeParse(nombre);
      if (!nombreOk.success) {
        setLoading(false);
        setNombreError(nombreOk.error.issues[0].message);
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

  const tabClass = (active: boolean) =>
    `min-h-12 flex-1 rounded-pill px-4 text-sm font-semibold transition-colors ${
      active ? "bg-bosque text-white" : "text-tinta hover:bg-salvia-100"
    }`;

  return (
    <AuthFrame aside="entrar">
      {sent ? (
        <div role="status" className="space-y-5">
          <h1 className="text-3xl font-bold tracking-tight text-bosque">
            Revisá tu <span className="text-miel-800">mail</span>
          </h1>
          <p className="text-base text-tinta">{AUTH_COPY.checkEmail}</p>
          <Button
            variant="outline"
            onClick={() => {
              setSent(false);
              setTab("entrar");
            }}
          >
            Volver a entrar
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-6 flex rounded-pill border border-suave bg-papel p-1">
            {(["entrar", "registro"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={tab === t}
                onClick={() => setTab(t)}
                className={tabClass(tab === t)}
              >
                {t === "entrar" ? "Entrar" : "Crear cuenta"}
              </button>
            ))}
          </div>

          <AuthHeading
            title={tab === "entrar" ? "Bienvenida" : "Empezá tu"}
            accent={tab === "entrar" ? "de nuevo" : "camino"}
            lead={tab === "entrar" ? "Ingresá con tu cuenta para continuar." : "Creá tu cuenta y accedé al círculo."}
          />

          {/* `method="post"` no lo usa nadie mientras haya JS: `handleSubmit` hace preventDefault
              y el login va por Supabase. Está por lo que pasa si el JS NO carga: el envío nativo
              por defecto es GET, y un GET pone los campos en la URL (historial, logs, Referer).
              Hoy no se filtra nada porque los inputs son controlados y no tienen `name`, pero eso
              es un accidente: si alguien agrega `name="password"` la clave viajaría en la query.
              Con POST el peor caso es un 405. */}
          <form onSubmit={handleSubmit} method="post" className="space-y-5">
            {tab === "registro" && (
              <AuthField
                id="entrar-nombre"
                label="Nombre"
                type="text"
                autoComplete="name"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre"
                error={nombreError}
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
                    className="inline-flex min-h-8 items-center text-sm font-semibold text-miel-800 underline-offset-4 hover:underline"
                  >
                    ¿Olvidaste la clave?
                  </Link>
                )
              }
            />

            {error && (
              <p role="alert" className="flex items-start gap-2 text-sm font-medium text-error">
                <ErrorMark />
                {error}
              </p>
            )}

            <SubmitButton loading={loading} label={tab === "entrar" ? "Ingresar" : "Crear cuenta"} />
          </form>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-salvia" />
            <span className="text-sm text-suave">o continuá con</span>
            <div className="h-px flex-1 bg-salvia" />
          </div>

          <GoogleButton next={next} disabled={loading} onError={setError} />

          <p className="mt-6 text-center text-sm text-tinta">
            {tab === "entrar" ? (
              <>
                ¿No tenés cuenta?{" "}
                <Button variant="ghost" size="sm" onClick={() => setTab("registro")} className="text-miel-800">
                  Registrate
                </Button>
              </>
            ) : (
              <>
                ¿Ya tenés cuenta?{" "}
                <Button variant="ghost" size="sm" onClick={() => setTab("entrar")} className="text-miel-800">
                  Ingresá
                </Button>
              </>
            )}
          </p>
        </>
      )}
    </AuthFrame>
  );
}
