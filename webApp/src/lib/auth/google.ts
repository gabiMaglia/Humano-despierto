import { internalNext } from "./safe-next";
import { callbackUrl } from "./paths";
import { AUTH_COPY, authErrorMessage } from "./messages";

// Tipo estructural y no `SupabaseClient`: el test pasa un objeto con solo este método.
export interface OAuthClient {
  auth: {
    signInWithOAuth(credentials: {
      provider: "google";
      options: { redirectTo: string };
    }): Promise<{ error: { code?: string } | null }>;
  };
}

// Mismo camino PKCE que la confirmación de mail: GoTrue vuelve a /auth/callback y el canje usa el
// verificador que el SDK deja en una cookie de `origin`. Por eso `origin` tiene que ser el del
// navegador y no SITE_URL: localhost y 127.0.0.1 no comparten cookies.
// `next` se sanea otra vez aunque /entrar ya lo haga: esta función es la única puerta del flujo.
// Ausente o inválido viaja como ausente, no como /panel: el callback elige por rol (c.9).
export async function startGoogleSignIn(
  client: OAuthClient,
  origin: string,
  next: string | null,
): Promise<string | null> {
  try {
    const { error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl(origin, internalNext(next)) },
    });
    return error ? (authErrorMessage(error) ?? AUTH_COPY.generic) : null;
  } catch {
    // Corre en el navegador, donde no hay logger: la alumna ve el mensaje genérico.
    return AUTH_COPY.generic;
  }
}
