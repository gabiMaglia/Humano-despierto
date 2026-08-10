import { z } from "zod";

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
const LOCATOR_PATTERNS: RegExp[] = [
  /:\/\//,
  /(^|[^a-z0-9])www\./i,
  // Espejo EXACTO de la migracion 0010. Dos cosas, y confundirlas ya costo un bug:
  //
  //  1. La alternancia de TLD va en minuscula y sin /i, a proposito: un dominio pegado
  //     viene en minuscula y el typo de prosa castellana ("termina.Me parece")
  //     capitaliza porque arranca oracion. Sin eso se bloquea texto legitimo.
  //  2. Las clases de alrededor SI cubren mayusculas — [A-Za-z0-9] y [^A-Za-z], no
  //     [a-z0-9]/[^a-z]. En SQL, pasar de ~* a ~ NO toca las clases POSIX
  //     [[:alnum:]]/[[:alpha:]], que siempre incluyen ambos casos. Al sacar /i aca sin
  //     ajustar las clases, "PDF.com/x" quedaba bloqueado por la DB y aceptado por el
  //     cliente: la direccion peligrosa. Son operaciones distintas, no la misma.
  /[A-Za-z0-9]\.(com|net|org|io|co|app|dev|edu|gov|info|me|be|ly|gl|nz|cloud|link|site|online|page|xyz|tv)([^A-Za-z]|$)/,
];

function hasLocator(v: string): boolean {
  if (LOCATOR_PATTERNS.some((re) => re.test(v))) return true;
  return (v.match(/[A-Za-z0-9_]{25,}/g) ?? []).some(
    (run) => /[0-9]/.test(run) && /[a-z]/.test(run) && /[A-Z]/.test(run),
  );
}

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
  romanNum: noLocator(z.string().trim().max(20).optional().or(z.literal("")), "numeral"),
  moonGlyph: noLocator(z.string().trim().max(8).optional().or(z.literal("")), "glifo"),
  // `includes` es el gemelo semántico de `lesson_resources.name`: el "qué incluye el curso"
  // del catálogo. Se valida línea por línea porque en la DB es text[] y el CHECK va por elemento.
  includes: noLocator(z.string().trim().max(4000).optional().or(z.literal("")), "qué incluye"),
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
