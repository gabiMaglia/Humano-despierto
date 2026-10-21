import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn() }));

vi.mock("@/lib/server/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));

import { postLoginDestinationAction } from "./actions";

const asRole = (role: string) => mocks.getCurrentUser.mockResolvedValue({ id: "u1", role });

describe("postLoginDestinationAction (c.9)", () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockReset();
  });

  it.each([
    ["admin", "/panel/admin"],
    ["teacher", "/panel/docente"],
    ["student", "/panel"],
  ])("sin next, %s va a %s según profiles.role", async (role, expected) => {
    asRole(role);
    expect(await postLoginDestinationAction(null)).toBe(expected);
  });

  it("con next válido gana next y no consulta el rol", async () => {
    asRole("admin");
    expect(await postLoginDestinationAction("/leccion/abc")).toBe("/leccion/abc");
    expect(mocks.getCurrentUser).not.toHaveBeenCalled();
  });

  it("un next externo que llegue del cliente se descarta en el servidor", async () => {
    asRole("teacher");
    expect(await postLoginDestinationAction("//evil.tld")).toBe("/panel/docente");
  });

  it("sin sesión o sin perfil cae en /panel", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect(await postLoginDestinationAction(null)).toBe("/panel");
  });
});
