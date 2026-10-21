// Ningún texto distingue "existe la cuenta" de "no existe": GoTrue ya responde igual en ambos
// casos y la pantalla no puede ser la que filtre esa diferencia.
export const AUTH_COPY = {
  linkExpired: "El enlace venció o ya se usó. Pedí uno nuevo.",
  confirmEmail: "Confirmá tu mail para entrar.",
  checkEmail:
    "Si el mail es válido, te mandamos un enlace para confirmar la cuenta. Abrilo desde este mismo navegador.",
  resetSent:
    "Si existe una cuenta con ese mail, te llega un enlace para crear una clave nueva. Abrilo desde este mismo navegador.",
  invalidCredentials: "Mail o clave incorrectos.",
  tooManyAttempts: "Demasiados intentos. Esperá un momento y probá de nuevo.",
  samePassword: "La clave nueva tiene que ser distinta de la anterior.",
  weakPassword: "Esa clave es demasiado débil. Probá con una más larga.",
  generic: "No pudimos completar el pedido. Probá de nuevo.",
} as const;

export function authErrorMessage(error: { code?: string } | null): string | null {
  if (!error) return null;
  switch (error.code) {
    case "email_not_confirmed":
      return AUTH_COPY.confirmEmail;
    case "invalid_credentials":
      return AUTH_COPY.invalidCredentials;
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return AUTH_COPY.tooManyAttempts;
    case "same_password":
      return AUTH_COPY.samePassword;
    case "weak_password":
      return AUTH_COPY.weakPassword;
    default:
      return AUTH_COPY.generic;
  }
}
