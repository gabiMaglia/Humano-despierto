import { describe, expect, it } from "vitest";
import { profileFormSchema, toProfileUpdate } from "./profile";

const base = { fullName: "Sol Mayor", bio: "", phone: "", birthDate: "" };

describe("profileFormSchema", () => {
  it("acepta un perfil minimo y lo traduce a columnas con null en lo vacio", () => {
    const r = profileFormSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(toProfileUpdate(r.data)).toEqual({ full_name: "Sol Mayor", bio: null, phone: null, birth_date: null });
    }
  });

  it.each(["+54 11 4000-0000", "011 4000 0000", "(011) 4000-0000", "+5491140000000"])("acepta el telefono %s", (phone) => {
    expect(profileFormSchema.safeParse({ ...base, phone }).success).toBe(true);
  });

  // Espejo de `profiles_phone_format` (0028): mismo regex, mismos bordes.
  it.each(["llamame", "12345", "+54 11 4000-0000 int 2", "-5491140000000", "+54 11 4000-0000-0000-0000"])(
    "rechaza el telefono %s",
    (phone) => {
      expect(profileFormSchema.safeParse({ ...base, phone }).success).toBe(false);
    },
  );

  it("acepta una fecha de nacimiento real", () => {
    expect(profileFormSchema.safeParse({ ...base, birthDate: "1985-03-21" }).success).toBe(true);
  });

  it.each(["2999-01-01", "1899-12-31", "1900-01-01", "2023-02-31", "21/03/1985"])("rechaza la fecha %s", (birthDate) => {
    expect(profileFormSchema.safeParse({ ...base, birthDate }).success).toBe(false);
  });

  it("rechaza una bio con link (R-3) y un nombre de una letra", () => {
    expect(profileFormSchema.safeParse({ ...base, bio: "Material en https://drive.google.com/file/d/X" }).success).toBe(false);
    expect(profileFormSchema.safeParse({ ...base, fullName: "S" }).success).toBe(false);
  });
});
