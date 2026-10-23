import { bioSchema, birthDateSchema, fullNameSchema, phoneSchema } from "@/lib/validation/profile";

export type ProfileField = "fullName" | "bio" | "phone" | "birthDate";

// Los mismos sub-schemas que usa `updateProfileAction`: el cliente no puede aceptar algo que el
// servidor rechace. Se separan por campo porque la action devuelve un solo mensaje sin decir de cuál.
const SCHEMAS = { fullName: fullNameSchema, bio: bioSchema, phone: phoneSchema, birthDate: birthDateSchema };

export function profileFieldErrors(values: Record<ProfileField, string>): Partial<Record<ProfileField, string>> {
  const errors: Partial<Record<ProfileField, string>> = {};
  for (const field of Object.keys(SCHEMAS) as ProfileField[]) {
    const result = SCHEMAS[field].safeParse(values[field]);
    if (!result.success) errors[field] = result.error.issues[0]?.message ?? "Revisá este dato.";
  }
  return errors;
}
