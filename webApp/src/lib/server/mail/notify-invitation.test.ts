import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ sendMail: vi.fn() }));
vi.mock("@/lib/server/mail/send", () => ({ sendMail: mocks.sendMail }));
vi.mock("@/lib/server/supabase-admin", () => ({ getAdminSupabaseClient: vi.fn() }));

import { notifyTeacherInvitation } from "./notify";

const INPUT = {
  email: "nueva@mail.com",
  inviterName: "Admin",
  acceptUrl: `http://localhost:3101/invitacion/${"A".repeat(43)}`,
  expiresAt: "2026-10-28T12:00:00.123456+00:00",
};

describe("notifyTeacherInvitation", () => {
  // Con llaves: si el hook devuelve el mock, Vitest lo corre como teardown y el rechazo salta afuera.
  beforeEach(() => {
    mocks.sendMail.mockReset();
  });

  it("manda a un mail sin cuenta: destinatario sin user_id ni nombre", async () => {
    mocks.sendMail.mockResolvedValue({ ok: true });
    await expect(notifyTeacherInvitation(INPUT)).resolves.toBe(true);
    const [arg] = mocks.sendMail.mock.calls[0];
    expect(arg.to).toEqual({ email: "nueva@mail.com" });
    expect(arg.text).toContain(INPUT.acceptUrl);
    expect(arg.text).toContain("28 de octubre de 2026");
  });

  it("SMTP caído: devuelve false, no tira (lección T-020)", async () => {
    mocks.sendMail.mockResolvedValue({ ok: false, error: "ECONNREFUSED" });
    await expect(notifyTeacherInvitation(INPUT)).resolves.toBe(false);
  });

  it("aunque algo adentro tire, devuelve false", async () => {
    mocks.sendMail.mockRejectedValue(new Error("inesperado"));
    await expect(notifyTeacherInvitation(INPUT)).resolves.toBe(false);
  });
});
