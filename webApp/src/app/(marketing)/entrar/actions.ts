"use server";

import { getCurrentUser } from "@/lib/server/auth";
import { notifyWelcome } from "@/lib/server/mail/notify";

/**
 * Mail 3/4 (T-020): bienvenida al registrarse. El destinatario se resuelve SIEMPRE server-side
 * contra la sesión actual (`getCurrentUser`) — esta acción no recibe ni email ni nombre por
 * parámetro. Un Server Action que mande mail a lo que el cliente le pase en el body es un relay
 * abierto (lección del playbook, sección Backend); acá ni existe el parámetro que lo permitiría.
 * Si no hay sesión (llamada fuera de flujo, replay, lo que sea) no hace nada — no hay a quién
 * escribirle.
 */
export async function sendWelcomeEmailAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await notifyWelcome({ userId: user.id });
}
