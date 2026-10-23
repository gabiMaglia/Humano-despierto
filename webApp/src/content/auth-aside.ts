/** Foto y frase del costado de las pantallas de acceso. Sólo fotos de `placeholder-photos` (ADR-015),
 *  sin personas: junto a un formulario de login un rostro de stock sugeriría una usuaria real. */
export const AUTH_ASIDE = {
  entrar: { photoId: "1470252649378-9c29740c9fa8", phrase: "Un oficio se aprende de a poco, a tu ritmo." },
  recuperar: { photoId: "1441974231531-c6227db76b6e", phrase: "Con calma: te ayudamos a volver." },
  nuevaClave: { photoId: "1441974231531-c6227db76b6e", phrase: "Elegí una clave que puedas recordar." },
  invitacion: { photoId: "1470252649378-9c29740c9fa8", phrase: "Pedí una invitación nueva y seguimos." },
} as const;

export type AuthAsideKey = keyof typeof AUTH_ASIDE;
