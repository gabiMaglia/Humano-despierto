import { z } from "zod";
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
