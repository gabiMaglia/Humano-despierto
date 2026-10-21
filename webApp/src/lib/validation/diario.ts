import { z } from "zod";
import { noLocator, slugSchema } from "@/lib/validation/teacher";

// Validación de formularios del Diario (T-022). Mismo patrón que `courseFormSchema`
// (`lib/validation/teacher.ts`): Zod cubre el camino del formulario, la DB (CHECK +
// guard trigger, migración 0018) es la barrera real (ADR-002/ADR-009).
//
// `body` NO lleva `noLocator` — a propósito, es la decisión central del ticket. `noLocator`
// espeja `text_has_locator` (la heurística de FORMA: cualquier `://`/`www.`/host con TLD
// conocido), que bloquea TODO link. Un post de blog es justo el lugar donde un link legítimo
// pertenece (citar una fuente, el propio sitio de la docente). Lo que protege el cuerpo en la
// DB es `body_has_known_locator` — coincidencia EXACTA contra los localizadores reales de esta
// plataforma, cero falsos positivos — aplicada en un guard trigger, no en un CHECK de forma, y
// sin bypass de service_role (ver la nota larga en la migración 0018). No hay equivalente de
// esa función en el cliente: depende de leer `lessons`/`lesson_resources` con `service_role`,
// así que no hay "espejo" de formulario posible para esta regla — es DB-only por diseño.
export const diarioPostFormSchema = z.object({
  slug: slugSchema,
  title: noLocator(z.string().trim().min(1, "El título es obligatorio.").max(200), "título"),
  excerpt: noLocator(z.string().trim().max(400).optional().or(z.literal("")), "resumen"),
  body: z.string().trim().min(1, "El cuerpo no puede estar vacío.").max(20000, "El cuerpo es demasiado largo."),
});

export type DiarioPostFormInput = z.input<typeof diarioPostFormSchema>;
