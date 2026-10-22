import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Sin mock del sujeto: lo que se prueba es D-50, que la IP del cupo sale de `clientIpFrom` (vía
// `currentRateLimitSubject`) y no del header crudo. Sin sesión, `getClaims` no trae `sub`.
const { headersMock } = vi.hoisted(() => ({ headersMock: vi.fn() }));
vi.mock("next/headers", () => ({ headers: () => headersMock() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getClaims: async () => ({ data: null, error: null }) } }),
}));

import { reportClientErrorAction } from "./report-error";
import { __resetRateLimiterForTests } from "@/lib/server/rate-limit";

let err: ReturnType<typeof vi.spyOn>;
const reported = () =>
  err.mock.calls.map((c: unknown[]) => JSON.parse(String(c[0]))).filter((l: { event: string }) => l.event === "client_error");

beforeEach(() => {
  __resetRateLimiterForTests();
  vi.useFakeTimers({ now: new Date("2026-10-22T12:05:30Z"), toFake: ["Date"] });
  err = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("reportClientErrorAction con tope (T-050, D-50)", () => {
  it("11 reportes de la misma IP en un minuto: el 11 se descarta sin log ni error", async () => {
    headersMock.mockResolvedValue(new Headers({ "x-forwarded-for": "9.9.9.9, 1.1.1.1" }));
    for (let i = 0; i < 11; i++) {
      await expect(reportClientErrorAction({ digest: String(i), message: "m", path: "/" })).resolves.toBeUndefined();
    }
    expect(reported()).toHaveLength(10);
  });

  it("otra IP no comparte el cupo", async () => {
    headersMock.mockResolvedValue(new Headers({ "x-forwarded-for": "9.9.9.9" }));
    for (let i = 0; i < 10; i++) await reportClientErrorAction({ digest: "a", message: "m", path: "/" });
    headersMock.mockResolvedValue(new Headers({ "x-forwarded-for": "2.2.2.2" }));
    await reportClientErrorAction({ digest: "b", message: "m", path: "/" });
    expect(reported()).toHaveLength(11);
  });

  it("un x-forwarded-for que no es IP no consigue cupo nuevo en cada pedido", async () => {
    for (let i = 0; i < 15; i++) {
      headersMock.mockResolvedValue(new Headers({ "x-forwarded-for": `inventado-${i}` }));
      await reportClientErrorAction({ digest: String(i), message: "m", path: "/" });
    }
    expect(reported()).toHaveLength(10);
  });
});
