import { z } from "zod";
import { noLocator } from "@/lib/validation/teacher";

// Espejo de los CHECK de la migración de T-030: el formulario frena antes y con un mensaje
// legible; la autoridad sigue siendo la base.
export const questionSchema = z.object({
  title: noLocator(
    z.string().trim().min(3, "El título necesita al menos 3 caracteres.").max(200, "El título admite hasta 200 caracteres."),
    "título",
  ),
  body: noLocator(
    z.string().trim().min(1, "Contá tu pregunta.").max(4000, "La pregunta admite hasta 4000 caracteres."),
    "pregunta",
  ),
});

export const answerSchema = z.object({
  body: noLocator(
    z.string().trim().min(1, "Escribí la respuesta.").max(4000, "La respuesta admite hasta 4000 caracteres."),
    "respuesta",
  ),
});

export const moderationSchema = z.object({
  reason: noLocator(
    z.string().trim().min(1, "Borrar exige un motivo.").max(500, "El motivo admite hasta 500 caracteres."),
    "motivo",
  ),
});

// Los ids llegan como argumentos ligados desde el cliente: son datos no confiables.
export const idSchema = z.uuid();
