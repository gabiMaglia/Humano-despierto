import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveAuthCallback, type ExchangeClient } from "./auth-callback";

const exchange = vi.fn();
// Cadena `from("profiles").select("role").eq("id", …).maybeSingle()`: cada eslabón se espía
// para afirmar qué fila se lee, no solo qué devuelve.
const maybeSingle = vi.fn();
const eq = vi.fn(() => ({ maybeSingle }));
const select = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ select }));
const client = { auth: { exchangeCodeForSession: exchange }, from } as unknown as ExchangeClient;
const qs = (s: string) => new URLSearchParams(s);

describe("resolveAuthCallback", () => {
  // Con llaves: si el callback devuelve el mock, Vitest lo toma como teardown y lo invoca.
  beforeEach(() => {
    exchange.mockReset();
    from.mockClear();
    select.mockClear();
    eq.mockClear();
    maybeSingle.mockReset();
    maybeSingle.mockResolvedValue({ data: { role: "student" }, error: null });
  });

  // T-041 ronda 2: el c.9 de T-040 vale para todo login, también Google y la confirmación de mail.
  describe("sin next válido el destino sale de profiles.role (T-040 c.9, R-2)", () => {
    it.each([
      ["admin", "/panel/admin"],
      ["teacher", "/panel/docente"],
      ["student", "/panel"],
    ])("rol %s sin next → %s, leyendo la fila del usuario del canje", async (role, expected) => {
      exchange.mockResolvedValue({ data: { user: { id: "u-rol" } }, error: null });
      maybeSingle.mockResolvedValue({ data: { role }, error: null });
      const out = await resolveAuthCallback(client, qs("code=ok"));
      expect(out).toEqual({ kind: "session", destination: expected, userId: "u-rol", sendWelcome: true });
      expect(from).toHaveBeenCalledWith("profiles");
      expect(select).toHaveBeenCalledWith("role");
      expect(eq).toHaveBeenCalledWith("id", "u-rol");
    });

    it("next externo con rol teacher → /panel/docente", async () => {
      exchange.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
      maybeSingle.mockResolvedValue({ data: { role: "teacher" }, error: null });
      const out = await resolveAuthCallback(client, qs("code=ok&next=https%3A%2F%2Fevil.tld"));
      expect(out.destination).toBe("/panel/docente");
    });

    it("next interno gana sobre el rol y no lee profiles", async () => {
      exchange.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
      maybeSingle.mockResolvedValue({ data: { role: "admin" }, error: null });
      const out = await resolveAuthCallback(client, qs("code=ok&next=%2Fcursos%2Fx"));
      expect(out.destination).toBe("/cursos/x");
      expect(from).not.toHaveBeenCalled();
    });

    it("si la lectura del rol devuelve error → /panel, nunca el error de link (la sesión ya existe)", async () => {
      exchange.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
      maybeSingle.mockResolvedValue({ data: null, error: { code: "42501", message: "denied" } });
      expect(await resolveAuthCallback(client, qs("code=ok"))).toEqual({
        kind: "session",
        destination: "/panel",
        userId: "u1",
        sendWelcome: true,
      });
    });

    it("si la lectura del rol lanza → /panel con sesión", async () => {
      exchange.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
      maybeSingle.mockRejectedValue(new Error("red caída"));
      expect(await resolveAuthCallback(client, qs("code=ok"))).toMatchObject({
        kind: "session",
        destination: "/panel",
      });
    });
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
