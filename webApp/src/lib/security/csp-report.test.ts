import { describe, expect, it } from "vitest";
import { parseCspReport, redactUri } from "./csp-report";

describe("parseCspReport", () => {
  it("formato report-uri (application/csp-report)", () => {
    expect(
      parseCspReport({
        "csp-report": {
          "document-uri": "http://localhost:3000/leccion/abc?t=30",
          "blocked-uri": "inline",
          "violated-directive": "script-src-elem",
          disposition: "report",
        },
      }),
    ).toEqual({
      documentUri: "http://localhost:3000/leccion/abc",
      blockedUri: "inline",
      violatedDirective: "script-src-elem",
      disposition: "report",
    });
  });

  it("formato Reporting API (por si un navegador lo manda igual)", () => {
    expect(
      parseCspReport([
        {
          type: "csp-violation",
          body: {
            documentURL: "http://localhost:3000/",
            blockedURL: "https://evil.tld/x.js",
            effectiveDirective: "script-src-elem",
            disposition: "enforce",
          },
        },
      ]),
    ).toMatchObject({ blockedUri: "https://evil.tld/x.js", disposition: "enforce" });
  });

  it("basura o forma desconocida: null", () => {
    for (const b of [null, 1, "x", {}, [], { "csp-report": "x" }, [{ type: "deprecation", body: {} }]]) {
      expect(parseCspReport(b)).toBeNull();
    }
  });

  it("un reporte sin directiva violada no es un reporte: null", () => {
    expect(parseCspReport({ "csp-report": { "blocked-uri": "inline", "document-uri": "http://localhost/" } })).toBeNull();
  });

  it("campos largos se truncan a 500", () => {
    const v = parseCspReport({
      "csp-report": {
        "blocked-uri": "https://a.tld/" + "x".repeat(2000),
        "violated-directive": "img-src",
        "document-uri": "http://localhost/",
      },
    });
    expect(v!.blockedUri.length).toBeLessThanOrEqual(500);
  });

  it("el blocked-uri tambien pierde su query (una URL firmada de Storage lleva ?token=)", () => {
    const v = parseCspReport({
      "csp-report": {
        "blocked-uri": "http://127.0.0.1:54321/storage/v1/object/sign/uploads/a.jpg?token=eyJ.x.y",
        "violated-directive": "img-src",
        "document-uri": "http://localhost:3000/entrar/nueva-clave?code=secreto#frag",
      },
    });
    expect(v!.blockedUri).toBe("http://127.0.0.1:54321/storage/v1/object/sign/uploads/a.jpg");
    expect(v!.documentUri).toBe("http://localhost:3000/entrar/nueva-clave");
  });
});

describe("redactUri", () => {
  it("saca query y fragmento: una URL firmada de Storage lleva ?token=<jwt>", () => {
    expect(redactUri("http://127.0.0.1:54321/storage/v1/object/sign/uploads/covers/a.jpg?token=eyJ.x.y")).toBe(
      "http://127.0.0.1:54321/storage/v1/object/sign/uploads/covers/a.jpg",
    );
    expect(redactUri("http://localhost:3000/entrar?next=/panel#x")).toBe("http://localhost:3000/entrar");
  });
  it("las palabras clave de CSP pasan tal cual", () => {
    for (const k of ["inline", "eval", "data", "blob", ""]) expect(redactUri(k)).toBe(k);
  });
  it("lo que no parsea como URL igual pierde lo que va despues de ? o #", () => {
    expect(redactUri("/relativa?token=x")).toBe("/relativa");
  });
});
