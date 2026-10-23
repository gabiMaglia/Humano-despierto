import { describe, expect, it } from "vitest";
import { errorDigest, toClientErrorReport } from "./client-error-report";

describe("toClientErrorReport", () => {
  it("toma digest y message de un Error de Server Component", () => {
    const err = Object.assign(new Error("boom"), { digest: "123abc" });
    expect(toClientErrorReport(err)).toEqual({ digest: "123abc", message: "boom" });
  });

  it("un Error de cliente sin digest no inventa uno", () => {
    expect(toClientErrorReport(new Error("x"))).toEqual({ digest: undefined, message: "x" });
  });

  it("un valor que no es Error (throw de cliente) viaja como texto", () => {
    expect(toClientErrorReport("se cayó")).toEqual({ digest: undefined, message: "se cayó" });
    expect(toClientErrorReport(undefined)).toEqual({ digest: undefined, message: "undefined" });
  });

  it("un digest que no es string se ignora", () => {
    const err = Object.assign(new Error("y"), { digest: 42 });
    expect(toClientErrorReport(err)).toEqual({ digest: undefined, message: "y" });
  });
});

describe("errorDigest", () => {
  it("devuelve el digest sólo si es un string", () => {
    expect(errorDigest(Object.assign(new Error("a"), { digest: "d1" }))).toBe("d1");
    expect(errorDigest("a")).toBeUndefined();
    expect(errorDigest(null)).toBeUndefined();
  });
});
