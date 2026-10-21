import { describe, expect, it } from "vitest";
import { internalNext } from "./safe-next";
import { homeForRole } from "./paths";

describe("homeForRole (c.9)", () => {
  it.each([
    ["admin", "/panel/admin"],
    ["teacher", "/panel/docente"],
    ["student", "/panel"],
    [null, "/panel"],
    [undefined, "/panel"],
    ["superadmin", "/panel"],
  ])("%j cae en %s", (role, expected) => {
    expect(homeForRole(role)).toBe(expected);
  });
});

describe("internalNext", () => {
  it("devuelve la ruta interna tal cual", () => {
    expect(internalNext("/cursos?x=1")).toBe("/cursos?x=1");
  });
  it.each([[undefined], [null], [""], ["//evil.tld"], ["https://evil.tld"], ["/\\evil.tld"]])(
    "%j cuenta como ausente",
    (raw) => {
      expect(internalNext(raw)).toBeNull();
    },
  );
});
