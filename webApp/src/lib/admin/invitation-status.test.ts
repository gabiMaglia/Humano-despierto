import { describe, expect, it } from "vitest";
import { invitationStatus } from "./invitation-status";

const NOW = new Date("2026-10-21T12:00:00Z");
const base = { expiresAt: "2026-10-28T12:00:00Z", acceptedAt: null, revokedAt: null };

describe("invitationStatus", () => {
  it("pendiente mientras no vence", () => expect(invitationStatus(base, NOW)).toBe("pendiente"));
  it("vencida desde el instante del vencimiento", () =>
    expect(invitationStatus({ ...base, expiresAt: "2026-10-21T12:00:00Z" }, NOW)).toBe("vencida"));
  it("aceptada gana a vencida", () =>
    expect(invitationStatus({ ...base, expiresAt: "2026-10-01T00:00:00Z", acceptedAt: "2026-09-30T00:00:00Z" }, NOW)).toBe("aceptada"));
  it("revocada gana a vencida", () =>
    expect(invitationStatus({ ...base, expiresAt: "2026-10-01T00:00:00Z", revokedAt: "2026-09-30T00:00:00Z" }, NOW)).toBe("revocada"));
});
