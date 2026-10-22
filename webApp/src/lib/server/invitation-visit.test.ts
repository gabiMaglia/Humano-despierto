import { describe, expect, it, vi } from "vitest";
import { INVALID_INVITATION_PATH, resolveInvitationVisit, type VisitDeps } from "./invitation-visit";

const TOKEN = "A".repeat(43);

function deps(over: Partial<VisitDeps> = {}) {
  const calls: string[] = [];
  const d: VisitDeps = {
    userId: vi.fn(async () => (calls.push("userId"), "u-1")),
    accept: vi.fn(async () => (calls.push("accept"), true)),
    refreshSession: vi.fn(async () => void calls.push("refresh")),
    roleOf: vi.fn(async () => (calls.push("roleOf"), "teacher")),
    ...over,
  };
  return { d, calls };
}

describe("resolveInvitationVisit", () => {
  it("token con otra forma: página neutra sin mirar la sesión", async () => {
    const { d } = deps();
    await expect(resolveInvitationVisit("corto", d)).resolves.toBe(INVALID_INVITATION_PATH);
    expect(d.userId).not.toHaveBeenCalled();
  });

  it("sin sesión: a /entrar con next codificado, sin aceptar nada", async () => {
    const { d } = deps({ userId: vi.fn(async () => null) });
    await expect(resolveInvitationVisit(TOKEN, d)).resolves.toBe(`/entrar?next=%2Finvitacion%2F${TOKEN}`);
    expect(d.accept).not.toHaveBeenCalled();
  });

  it("ajena, vencida o revocada (accept=false): página neutra, sin refrescar (c.3, c.4)", async () => {
    const { d } = deps({ accept: vi.fn(async () => false) });
    await expect(resolveInvitationVisit(TOKEN, d)).resolves.toBe(INVALID_INVITATION_PATH);
    expect(d.refreshSession).not.toHaveBeenCalled();
  });

  it("aceptada: refresca la sesión ANTES de decidir el destino por rol (c.2)", async () => {
    const { d, calls } = deps();
    await expect(resolveInvitationVisit(TOKEN, d)).resolves.toBe("/panel/docente");
    expect(calls).toEqual(["userId", "accept", "refresh", "roleOf"]);
    expect(d.accept).toHaveBeenCalledWith(TOKEN, "u-1");
  });

  it("una admin que acepta va a su panel (c.10)", async () => {
    const { d } = deps({ roleOf: vi.fn(async () => "admin") });
    await expect(resolveInvitationVisit(TOKEN, d)).resolves.toBe("/panel/admin");
  });

  it("si el refresh falla, igual redirige: el layout lee profiles y el claim se corrige solo", async () => {
    const { d } = deps({
      refreshSession: vi.fn(async () => {
        throw new Error("refresh");
      }),
    });
    await expect(resolveInvitationVisit(TOKEN, d)).resolves.toBe("/panel/docente");
  });
});
