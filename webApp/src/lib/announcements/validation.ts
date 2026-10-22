import { z } from "@/lib/validation/zod";
import { hasLocator } from "@/lib/validation/locator.mjs";

// Espejo de los CHECK de 0034 (largo y `text_has_locator`). La defensa es la base; esto traduce el
// mismo rechazo a un mensaje antes del viaje. El mensaje no dice "catálogo público" (el de
// `noLocator`): un anuncio lo leen inscriptas, no el catálogo.
const NO_LINK = "El anuncio no puede contener un link: el material va en la lección, no en el texto.";
const sinLink = <T extends z.ZodType<string>>(schema: T) => schema.refine((v) => !hasLocator(v), { message: NO_LINK });

export const announcementSchema = z.object({
  title: sinLink(
    z.string().trim().min(3, "El título necesita al menos 3 caracteres.").max(200, "El título admite hasta 200 caracteres."),
  ),
  body: sinLink(
    z.string().trim().min(1, "El anuncio no puede estar vacío.").max(6000, "El anuncio admite hasta 6000 caracteres."),
  ),
});

export const reasonSchema = z.object({
  reason: z.string().trim().min(1, "Retirar exige un motivo.").max(500, "El motivo admite hasta 500 caracteres."),
});

// `z.guid()` y no `z.uuid()`: zod 4 exige variante RFC en `uuid` y los ids sembrados a mano no la cumplen.
export const idSchema = z.guid();
