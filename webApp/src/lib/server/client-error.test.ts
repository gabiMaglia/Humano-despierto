import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const headersMock = vi.fn();
vi.mock("next/headers", () => ({ headers: () => headersMock() }));

import { reportClientError, resetClientErrorLimiter } from "./client-error";

let err: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  resetClientErrorLimiter();
  headersMock.mockResolvedValue(new Headers({ "x-forwarded-for": "9.9.9.9, 1.1.1.1" }));
  err = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

const lines = () => err.mock.calls.map((c: unknown[]) => JSON.parse(String(c[0])));

describe("reportClientError", () => {
  it("loguea client_error con digest, path sin query y message truncado a 500", async () => {
    await reportClientError({ digest: "abc", message: "x".repeat(900), path: "/panel?token=secreto" });
    const [l] = lines();
    expect(l).toMatchObject({ level: "error", event: "client_error", digest: "abc", path: "/panel" });
    expect(l.message).toHaveLength(500);
    expect(JSON.stringify(l)).not.toContain("secreto");
  });

  it("11 reportes de la misma IP en un minuto: el 11 se descarta sin log", async () => {
    for (let i = 0; i < 11; i++) await reportClientError({ digest: String(i), message: "m", path: "/" });
    expect(lines()).toHaveLength(10);
  });

  it("otra IP no comparte el cupo", async () => {
    for (let i = 0; i < 10; i++) await reportClientError({ digest: "a", message: "m", path: "/" });
    headersMock.mockResolvedValue(new Headers({ "x-forwarded-for": "2.2.2.2" }));
    await reportClientError({ digest: "b", message: "m", path: "/" });
    expect(lines()).toHaveLength(11);
  });

  it("entrada que no es del tipo esperado se ignora sin lanzar", async () => {
    await expect(reportClientError({ digest: 5, message: {}, path: null } as never)).resolves.toBeUndefined();
    await expect(reportClientError(undefined as never)).resolves.toBeUndefined();
    expect(lines().length).toBeLessThanOrEqual(1);
  });
});
