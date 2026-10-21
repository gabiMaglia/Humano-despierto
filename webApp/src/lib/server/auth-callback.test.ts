import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveAuthCallback, type ExchangeClient } from "./auth-callback";

const exchange = vi.fn();
const client = { auth: { exchangeCodeForSession: exchange } } as unknown as ExchangeClient;
const qs = (s: string) => new URLSearchParams(s);

describe("resolveAuthCallback", () => {
  // Con llaves: si el callback devuelve el mock, Vitest lo toma como teardown y lo invoca.
  beforeEach(() => {
    exchange.mockReset();
  });

  it("sin code va a /entrar?error=link y no llama a GoTrue (c.7)", async () => {
    expect(await resolveAuthCallback(client, qs("next=/panel"))).toEqual({
      kind: "error",
      destination: "/entrar?error=link",
    });
    expect(exchange).not.toHaveBeenCalled();
  });

  it("code inválido o ya usado va al mismo error neutro (c.6, c.7)", async () => {
    exchange.mockResolvedValue({ data: { user: null }, error: { code: "flow_state_not_found" } });
    expect(await resolveAuthCallback(client, qs("code=usado"))).toEqual({
      kind: "error",
      destination: "/entrar?error=link",
    });
  });

  it("si el SDK lanza, también es el error neutro", async () => {
    exchange.mockRejectedValue(new Error("red caída"));
    expect((await resolveAuthCallback(client, qs("code=x"))).kind).toBe("error");
  });

  it("confirmación: sesión, destino saneado y bienvenida (c.2)", async () => {
    exchange.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    expect(await resolveAuthCallback(client, qs("code=ok&next=%2Fleccion%2Fabc"))).toEqual({
      kind: "session",
      destination: "/leccion/abc",
      userId: "u1",
      sendWelcome: true,
    });
    expect(exchange).toHaveBeenCalledWith("ok", undefined);
  });

  it("next externo cae en /panel (c.3)", async () => {
    exchange.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const out = await resolveAuthCallback(client, qs("code=ok&next=https%3A%2F%2Fevil.tld"));
    expect(out.destination).toBe("/panel");
  });

  it("recuperación: va a nueva clave y NO manda bienvenida", async () => {
    exchange.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const out = await resolveAuthCallback(client, qs("code=ok&next=%2Fentrar%2Fnueva-clave"));
    expect(out).toMatchObject({ kind: "session", destination: "/entrar/nueva-clave", sendWelcome: false });
  });

  it("reenvía sb_flow_id cuando viene en el redirect", async () => {
    exchange.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    await resolveAuthCallback(client, qs("code=ok&sb_flow_id=f-123"));
    expect(exchange).toHaveBeenCalledWith("ok", { flowId: "f-123" });
  });
});
