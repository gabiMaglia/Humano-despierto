import { describe, expect, it } from "vitest";
import { resourceFormSchema } from "./teacher";

// D-17 · el alta guardaba cualquier texto como `url`; el handler de T-044 lo deniega al servir,
// pero la docente no se enteraba de que su recurso quedo inservible.
function parseLink(link: string) {
  return resourceFormSchema.safeParse({ type: "link", name: "Glosario", link, sizeLabel: "" });
}

describe("resourceFormSchema.link", () => {
  it("acepta links http(s), incluidos los de Drive", () => {
    expect(parseLink("https://drive.google.com/file/d/1AbC_def-GHIjkl/view").success).toBe(true);
    expect(parseLink("https://example.org/glosario-arcanos").success).toBe(true);
    expect(parseLink("http://example.org/a").success).toBe(true);
  });

  it("rechaza esquemas que no son http(s), rutas relativas y texto suelto", () => {
    for (const link of ["javascript:alert(1)", "data:text/html,hola", "/leccion/otra", "no es una url", "ftp://x.org/a"]) {
      const res = parseLink(link);
      expect(res.success, link).toBe(false);
      expect(res.error?.issues[0]?.message).toBe("El link tiene que empezar con http:// o https://.");
    }
  });
});
