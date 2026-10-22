import { z } from "@/lib/validation/zod";

// Espejo de `minimum_password_length` en supabase/config.toml. 72 es el tope de bcrypt: GoTrue
// rechaza más largo y es mejor decirlo en el formulario que devolver un error genérico.
export const PASSWORD_MIN_LENGTH = 6;
const PASSWORD_MAX_LENGTH = 72;

export const emailSchema = z.string().trim().max(254).pipe(z.email("Escribí un mail válido."));

export const newPasswordSchema = z
  .object({
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `La clave tiene que tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`)
      .max(PASSWORD_MAX_LENGTH, "La clave es demasiado larga."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Las dos claves no coinciden.", path: ["confirm"] });
