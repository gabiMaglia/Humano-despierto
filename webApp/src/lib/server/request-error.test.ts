import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: () => Promise.reject(new Error("fuera de request")) }));

import { reportRequestError } from "./request-error";

afterEach(() => vi.restoreAllMocks());

const CTX = { routerKind: "App Router", routePath: "/panel", routeType: "render" };

describe("reportRequestError", () => {
  it("loguea request_error con el digest que Next le puso al error, sin query", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = Object.assign(new Error("boom"), { digest: "d123" });
    await reportRequestError(err, { path: "/panel?code=secreto", method: "GET", headers: {} }, CTX);
    const line = JSON.parse(String(spy.mock.calls[0][0]));
    expect(line).toMatchObject({
      level: "error",
      event: "request_error",
      digest: "d123",
      path: "/panel",
      routerKind: "App Router",
      routeType: "render",
      err: { message: "boom" },
    });
    expect(String(spy.mock.calls[0][0])).not.toContain("secreto");
  });

  it("no lanza con un error que no es Error y deja digest en null", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      reportRequestError("texto", { path: "/", method: "GET", headers: {} }, { ...CTX, routeType: "route" }),
    ).resolves.toBeUndefined();
    expect(JSON.parse(String(spy.mock.calls[0][0])).digest).toBeNull();
  });
});
