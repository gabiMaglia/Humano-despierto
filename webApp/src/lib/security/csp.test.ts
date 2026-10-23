import { describe, expect, it } from "vitest";
import { CSP_REPORT_PATH, buildCsp, generateNonce } from "./csp";

const BASE = {
  nonce: "YWJjZGVmZ2gtaWprbC0xMjM0",
  supabaseUrl: "http://127.0.0.1:54321",
  siteUrl: "http://localhost:3000",
  isDev: false,
  enforce: false,
};

function directives(value: string): Map<string, string[]> {
  return new Map(
    value.split(";").map((d) => d.trim()).filter(Boolean).map((d) => {
      const [name, ...sources] = d.split(/\s+/);
      return [name, sources] as [string, string[]];
    }),
  );
}

describe("buildCsp", () => {
  it("sin CSP_ENFORCE la cabecera es Report-Only; con enforce cambia SOLO el nombre (c.3)", () => {
    const ro = buildCsp(BASE);
    const en = buildCsp({ ...BASE, enforce: true });
    expect(ro.name).toBe("Content-Security-Policy-Report-Only");
    expect(en.name).toBe("Content-Security-Policy");
    expect(en.value).toBe(ro.value); // siteUrl http: no suma upgrade-insecure-requests
  });

  it("script-src: nonce + strict-dynamic + YouTube, sin unsafe-inline; unsafe-eval solo en dev", () => {
    const prod = directives(buildCsp(BASE).value).get("script-src");
    expect(prod).toEqual(["'self'", `'nonce-${BASE.nonce}'`, "'strict-dynamic'", "https://www.youtube.com"]);
    const dev = directives(buildCsp({ ...BASE, isDev: true }).value).get("script-src");
    expect(dev).toContain("'unsafe-eval'");
    expect(prod).not.toContain("'unsafe-eval'");
  });

  it("style-src lleva unsafe-inline y NINGUN nonce (un nonce anularia unsafe-inline)", () => {
    const style = directives(buildCsp(BASE).value).get("style-src")!;
    expect(style).toEqual(["'self'", "'unsafe-inline'"]);
  });

  it("Supabase entra por ORIGEN (sin path) en img-src y connect-src; sin env, no entra nada", () => {
    const d = directives(buildCsp({ ...BASE, supabaseUrl: "https://abc.supabase.co/storage/v1/" }).value);
    expect(d.get("img-src")).toEqual([
      "'self'", "blob:", "data:", "https://i.ytimg.com", "https://images.unsplash.com", "https://abc.supabase.co",
    ]);
    expect(d.get("connect-src")).toEqual(["'self'", "https://abc.supabase.co"]);
    const sin = directives(buildCsp({ ...BASE, supabaseUrl: undefined }).value);
    expect(sin.get("connect-src")).toEqual(["'self'"]);
  });

  it("img-src admite Unsplash (placeholders Brote, ADR-015) y ese host no entra en connect-src", () => {
    const d = directives(buildCsp({ ...BASE, supabaseUrl: undefined }).value);
    expect(d.get("img-src")).toContain("https://images.unsplash.com");
    expect(d.get("connect-src")).not.toContain("https://images.unsplash.com");
  });

  it("una SUPABASE_URL que no es http(s) no se cuela como fuente", () => {
    for (const raw of ["javascript:alert(1)", "*", "not a url", "data:text/html,x"]) {
      const d = directives(buildCsp({ ...BASE, supabaseUrl: raw }).value);
      expect(d.get("connect-src")).toEqual(["'self'"]);
    }
  });

  it("frame-src permite los DOS dominios de YouTube (player y vista previa nocookie)", () => {
    expect(directives(buildCsp(BASE).value).get("frame-src")).toEqual([
      "https://www.youtube.com",
      "https://www.youtube-nocookie.com",
    ]);
  });

  it("cierres fijos: object-src none, base-uri, form-action, frame-ancestors self, report-uri", () => {
    const d = directives(buildCsp(BASE).value);
    expect(d.get("default-src")).toEqual(["'self'"]);
    expect(d.get("font-src")).toEqual(["'self'"]);
    expect(d.get("object-src")).toEqual(["'none'"]);
    expect(d.get("base-uri")).toEqual(["'self'"]);
    expect(d.get("form-action")).toEqual(["'self'"]);
    expect(d.get("frame-ancestors")).toEqual(["'self'"]);
    expect(d.get("report-uri")).toEqual([CSP_REPORT_PATH]);
    expect(d.has("report-to")).toBe(false);
  });

  it("upgrade-insecure-requests solo con enforce, fuera de dev y con SITE_URL https", () => {
    const has = (i: Partial<typeof BASE>) =>
      directives(buildCsp({ ...BASE, ...i }).value).has("upgrade-insecure-requests");
    expect(has({ enforce: true, siteUrl: "https://humano.example" })).toBe(true);
    expect(has({ enforce: false, siteUrl: "https://humano.example" })).toBe(false);
    expect(has({ enforce: true, siteUrl: "http://localhost:3000" })).toBe(false);
    expect(has({ enforce: true, isDev: true, siteUrl: "https://humano.example" })).toBe(false);
  });

  it("un nonce fuera de base64 lanza: no se puede inyectar una directiva por el nonce", () => {
    expect(() => buildCsp({ ...BASE, nonce: "x'; script-src *" })).toThrow();
  });

  it("generateNonce: base64, distinto en cada llamada", () => {
    const a = generateNonce();
    const b = generateNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
    expect(a).not.toBe(b);
  });
});
