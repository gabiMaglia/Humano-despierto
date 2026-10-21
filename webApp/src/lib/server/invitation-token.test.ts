import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { hashInvitationToken, invitationPath, newInvitationToken } from "./invitation-token";

describe("token de invitación", () => {
  it("son 32 bytes en base64url (43 caracteres) y la base guarda su sha256 hex", () => {
    const { token, tokenHash } = newInvitationToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(token, "base64url")).toHaveLength(32);
    expect(tokenHash).toBe(createHash("sha256").update(token, "utf8").digest("hex"));
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("dos tokens no se repiten", () => {
    expect(newInvitationToken().token).not.toBe(newInvitationToken().token);
  });

  it("hash con vector conocido", () => {
    expect(hashInvitationToken("A".repeat(43))).toBe("0f007385b6f9d4b7eeb2748605afe1a984a0a3bfa3f014d09e2a784ce9e5cd1a");
  });

  it.each([["", "vacío"], ["A".repeat(42), "corto"], ["A".repeat(44), "largo"], [`${"A".repeat(42)}=`, "con relleno"], [`${"A".repeat(42)}/`, "con barra"]])(
    "un token con otra forma no se hashea (%s, %s)",
    (raw) => {
      expect(hashInvitationToken(raw)).toBeNull();
    },
  );

  it("el path del link", () => {
    expect(invitationPath("A".repeat(43))).toBe(`/invitacion/${"A".repeat(43)}`);
  });
});
