import { z } from "@/lib/validation/zod";
import { noLocator } from "@/lib/validation/teacher";

/**
 * `profiles.full_name` lo escribe el formulario de registro, y es texto libre
 * **legible sin inscripción**: aparece como autor de curso en el catálogo público.
 * Por eso la migración 0008 le puso el mismo CHECK que al resto de esas columnas
 * (ADR-009).
 *
 * Sin este espejo, alguien que se registre con un nombre que el CHECK rechaza recibe
 * un error crudo de Postgres en vez de un mensaje. La regla se importa de
 * `validation/teacher` en vez de copiarse: dos definiciones del mismo invariante se
 * desincronizan — de hecho ya pasó entre el CHECK y su espejo del cliente.
 */
export const fullNameSchema = noLocator(
  z
    .string()
    .trim()
    .min(2, "Escribí tu nombre.")
    .max(120, "El nombre es demasiado largo."),
  "nombre",
);

// Espejo de `profiles_phone_format` (0028). Si este regex fuera mas permisivo que el CHECK, la
// persona veria un 23514 crudo en vez del mensaje.
export const PHONE_RE = /^\+?\(?[0-9][0-9 ()-]{5,19}$/;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// UTC a proposito (R-9): el CHECK compara contra `current_date` del servidor de Postgres, en UTC.
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function isRealDate(v: string): boolean {
  const parsed = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === v;
}

export const bioSchema = noLocator(
  z.string().trim().max(4000, "La bio es demasiado larga.").optional().or(z.literal("")),
  "bio",
);

export const phoneSchema = z
  .string()
  .trim()
  .regex(PHONE_RE, "El teléfono lleva números, espacios, guiones o paréntesis (ej: +54 11 4000-0000).")
  .optional()
  .or(z.literal(""));

export const birthDateSchema = z
  .string()
  .trim()
  .regex(ISO_DATE_RE, "La fecha no es válida.")
  .refine(isRealDate, "La fecha no es válida.")
  .refine((v) => v > "1900-01-01" && v <= todayUtc(), "La fecha tiene que estar entre 1900 y hoy.")
  .optional()
  .or(z.literal(""));

export const profileFormSchema = z.object({
  fullName: fullNameSchema,
  bio: bioSchema,
  phone: phoneSchema,
  birthDate: birthDateSchema,
});

export type ProfileFormValues = z.output<typeof profileFormSchema>;

/** Vacío es "no lo tengo", no "no lo toques": el formulario manda los cuatro campos siempre. */
export function toProfileUpdate(v: ProfileFormValues) {
  return {
    full_name: v.fullName,
    bio: v.bio || null,
    phone: v.phone || null,
    birth_date: v.birthDate || null,
  };
}
