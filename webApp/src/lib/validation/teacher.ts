import { z } from "@/lib/validation/zod";
// El predicado vive en un modulo plano para que el test de paridad ejecute ESTA
// misma funcion en vez de reconstruirla parseando el fuente (ver locator.mjs).
import { hasLocator } from "@/lib/validation/locator.mjs";

// Validación de formularios del panel docente (T-005 c.8). Sin `server-only`
// a propósito: son schemas puros, sin secreto ni cliente de datos — los
// Server Actions de `panel/docente/**/actions.ts` son la única puerta real
// (Zod valida forma, RLS + guards de servidor validan permiso), pero nada
// impide reusar el mismo schema del lado del cliente si algún form lo pide.

// T-016 · ESPEJO DE LA MIGRACIÓN 0008 (`public.text_has_locator`). No es defensa:
// la defensa es el CHECK en la DB, porque esta validación solo cubre el camino del
// formulario y no el de PostgREST con el JWT propio de la docente (ADR-009).
// Lo que sí es: la traducción del mismo rechazo a un mensaje legible. Si este regex
// fuera MÁS PERMISIVO que el de la DB, la docente vería un `23514` crudo del motor
// en vez de un error del formulario — por eso las dos definiciones se tocan juntas.
//
// Las cuatro reglas son las de 0008, en el mismo orden:
//   1. `://` cualquier esquema · 2. `www.` · 3. host con TLD conocido
//   4. id de Drive suelto: 25+ de [A-Za-z0-9_] con dígito Y mayúscula Y minúscula.
//      `-` queda fuera del charset o "Ritual-de-Luna-Nueva-Enero2026" sería falso positivo.
function rejectUrl(field: string, v: string): boolean {
  return !hasLocator(v);
}

const NO_URL_MESSAGE = (field: string) =>
  `"${field}" no puede contener un link — es texto libre visible en el catálogo público, sin inscripción.`;

/** Aplica el rechazo a un campo de texto libre que la DB ya cierra con un CHECK. */
export const noLocator = <T extends z.ZodType<string | undefined>>(schema: T, field: string) =>
  schema.refine((v) => !v || rejectUrl(field, v), { message: NO_URL_MESSAGE(field) });

export const slugSchema = z
  .string()
  .trim()
  .min(3, "El slug necesita al menos 3 caracteres.")
  .max(80)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "El slug es minúsculas, números y guiones (ej: tarot-iniciatico).");

// Los campos con `noLocator` son exactamente los que la migración 0008 cierra con un CHECK.
// `price`/`currency` no lo llevan: su dominio ya está cerrado por su propio regex.
export const courseFormSchema = z.object({
  slug: slugSchema,
  title: noLocator(z.string().trim().min(1, "El título es obligatorio.").max(200), "título"),
  titleEm: noLocator(z.string().trim().max(200).optional().or(z.literal("")), "título destacado"),
  subtitle: noLocator(z.string().trim().max(300).optional().or(z.literal("")), "subtítulo"),
  intro: noLocator(z.string().trim().max(4000).optional().or(z.literal("")), "introducción"),
  discipline: noLocator(z.string().trim().min(1, "La disciplina es obligatoria.").max(80), "disciplina"),
  level: noLocator(z.string().trim().min(1, "El nivel es obligatorio.").max(80), "nivel"),
  price: z
    .string()
    .trim()
    .regex(/^\d+([.,]\d{1,2})?$/, "El precio es un número (ej: 240 o 240.00)."),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "La moneda son 3 letras (ej: ARS).")
    .default("ARS"),
  moonGlyph: noLocator(z.string().trim().max(8).optional().or(z.literal("")), "glifo"),
  // `includes` es el gemelo semántico de `lesson_resources.name`: el "qué incluye el curso"
  // del catálogo. Se valida línea por línea porque en la DB es text[] y el CHECK va por elemento.
  includes: noLocator(z.string().trim().max(4000).optional().or(z.literal("")), "qué incluye"),
  // T-027 · los tres de texto son de la misma clase que `intro`: los lee `anon` sin sesion.
  //
  // LO QUE ESTE SCHEMA NO PUEDE CUBRIR, y hay que saberlo: `noLocator` es el espejo de
  // `text_has_locator` — la mitad de FORMA de ADR-009. La otra mitad (coincidencia EXACTA contra
  // `lessons.video_id`) necesita CONSULTAR la base y no se puede replicar aca. Un video_id son
  // 11 caracteres sin forma de URL: pasa este schema y lo frena `courses_locator_guard` (0023)
  // con un 42501 que el Server Action tiene que traducir, o la docente ve un error crudo.
  description: noLocator(z.string().trim().max(8000).optional().or(z.literal("")), "descripción"),
  learningObjectives: noLocator(z.string().trim().max(4000).optional().or(z.literal("")), "qué vas a aprender"),
  prerequisites: noLocator(z.string().trim().max(4000).optional().or(z.literal("")), "requisitos"),
  language: z
    .string().trim().toLowerCase()
    .regex(/^[a-z]{2}$/, "El idioma son 2 letras (ej: es).")
    .default("es"),
  // Mismo corte que `lessons.video_id` (T-005 c.4): el id, no la URL. Pegar la URL entera falla
  // aca con un mensaje legible en vez de rebotar contra el CHECK de la DB.
  promoVideoId: z
    .string().trim()
    .regex(/^[A-Za-z0-9_-]{11}$/, "Es el id del video (11 caracteres), no la URL entera.")
    .optional().or(z.literal("")),
});

export type CourseFormInput = z.input<typeof courseFormSchema>;

export function priceToCents(price: string): number {
  const normalized = price.replace(",", ".");
  return Math.round(Number(normalized) * 100);
}

export function includesToArray(includes: string | undefined): string[] {
  if (!includes) return [];
  return includes
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export const moduleFormSchema = z.object({
  title: noLocator(z.string().trim().min(1, "El título del módulo es obligatorio.").max(200), "título"),
  description: noLocator(z.string().trim().max(2000).optional().or(z.literal("")), "descripción"),
});

export const lessonFormSchema = z.object({
  title: noLocator(z.string().trim().min(1, "El título de la lección es obligatorio.").max(200), "título"),
  description: noLocator(z.string().trim().max(4000).optional().or(z.literal("")), "descripción"),
  isPreview: z.boolean().default(false),
});

export const videoUrlSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "Pegá un link de YouTube.")
    .max(500),
});

export const chapterFormSchema = z.object({
  label: noLocator(
    z.string().trim().min(1, "La etiqueta del capítulo es obligatoria.").max(200),
    "etiqueta",
  ),
  // Acepta "mm:ss", "h:mm:ss" o segundos crudos — se normaliza en el action.
  timestamp: z
    .string()
    .trim()
    .min(1, "El tiempo de inicio es obligatorio.")
    .regex(/^\d+(:\d{1,2}){0,2}$/, "Formato de tiempo inválido (usá mm:ss o segundos)."),
});

export function timestampToSeconds(raw: string): number {
  const parts = raw.split(":").map((p) => Number(p));
  if (parts.some((p) => Number.isNaN(p) || p < 0)) return NaN;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return NaN;
}

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

export const resourceFormSchema = z.object({
  type: z.enum(["pdf", "audio", "texto", "link"]),
  name: z
    .string()
    .trim()
    .min(1, "El nombre del recurso es obligatorio.")
    .max(200)
    .refine((v) => rejectUrl("name", v), { message: NO_URL_MESSAGE("nombre") }),
  // D-17 · el handler de descarga (T-044) solo redirige a http(s); cualquier otra cosa quedaria
  // guardada como un recurso que nunca abre.
  link: z
    .string()
    .trim()
    .min(1, "Pegá el link del recurso.")
    .max(1000)
    .refine(isHttpUrl, { message: "El link tiene que empezar con http:// o https://." }),
  sizeLabel: z
    .string()
    .trim()
    .max(40)
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || rejectUrl("size_label", v), { message: NO_URL_MESSAGE("tamaño") }),
});

export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Datos inválidos.";
}

/** El primer problema con el campo que lo causó (el `name` del form), para marcarlo en la vista. */
export function firstIssue(error: z.ZodError): { field?: string; message: string } {
  const issue = error.issues[0];
  const key = issue?.path[0];
  return { ...(typeof key === "string" ? { field: key } : {}), message: issue?.message ?? "Datos inválidos." };
}
