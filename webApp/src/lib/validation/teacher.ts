import { z } from "zod";

// Validación de formularios del panel docente (T-005 c.8). Sin `server-only`
// a propósito: son schemas puros, sin secreto ni cliente de datos — los
// Server Actions de `panel/docente/**/actions.ts` son la única puerta real
// (Zod valida forma, RLS + guards de servidor validan permiso), pero nada
// impide reusar el mismo schema del lado del cliente si algún form lo pide.

// T-005 restricción (punto 4, hallazgo del juez ciego en T-001): `name` y
// `size_label` de `lesson_resources` son texto libre, legible SIN
// inscripción (son el "qué incluye" del catálogo, ADR-003 regla A). El SQL
// no puede contener que una docente pegue ahí el link que la propia regla A
// esconde — se contiene acá. Heurística deliberadamente amplia (protocolo +
// "www." + dominios comunes): mejor un falso positivo que se corrige a mano
// que dejar pasar "Manual — drive.google.com/file/d/ABC".
const URL_LIKE = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|co|app|dev|edu|gov|info|me)\b)/i;

function rejectUrl(field: string, v: string): boolean {
  return !URL_LIKE.test(v);
}

const NO_URL_MESSAGE = (field: string) =>
  `"${field}" no puede contener un link — es texto libre visible en el catálogo público, sin inscripción.`;

export const slugSchema = z
  .string()
  .trim()
  .min(3, "El slug necesita al menos 3 caracteres.")
  .max(80)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "El slug es minúsculas, números y guiones (ej: tarot-iniciatico).");

export const courseFormSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(1, "El título es obligatorio.").max(200),
  titleEm: z.string().trim().max(200).optional().or(z.literal("")),
  subtitle: z.string().trim().max(300).optional().or(z.literal("")),
  intro: z.string().trim().max(4000).optional().or(z.literal("")),
  discipline: z.string().trim().min(1, "La disciplina es obligatoria.").max(80),
  level: z.string().trim().min(1, "El nivel es obligatorio.").max(80),
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
  romanNum: z.string().trim().max(20).optional().or(z.literal("")),
  moonGlyph: z.string().trim().max(8).optional().or(z.literal("")),
  includes: z.string().trim().max(4000).optional().or(z.literal("")),
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
  title: z.string().trim().min(1, "El título del módulo es obligatorio.").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const lessonFormSchema = z.object({
  title: z.string().trim().min(1, "El título de la lección es obligatorio.").max(200),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
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
  label: z.string().trim().min(1, "La etiqueta del capítulo es obligatoria.").max(200),
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

export const resourceFormSchema = z.object({
  type: z.enum(["pdf", "audio", "texto", "link"]),
  name: z
    .string()
    .trim()
    .min(1, "El nombre del recurso es obligatorio.")
    .max(200)
    .refine((v) => rejectUrl("name", v), { message: NO_URL_MESSAGE("nombre") }),
  link: z.string().trim().min(1, "Pegá el link del recurso.").max(1000),
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
