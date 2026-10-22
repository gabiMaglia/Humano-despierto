import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  inviteTeacher: vi.fn(),
  reissueInvitation: vi.fn(),
  revokeInvitation: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/server/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/server/supabase-admin", () => ({ getAdminSupabaseClient: vi.fn() }));
vi.mock("@/lib/server/invitations", () => ({
  inviteTeacher: mocks.inviteTeacher,
  reissueInvitation: mocks.reissueInvitation,
  revokeInvitation: mocks.revokeInvitation,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { inviteTeacherAction, resendInvitationAction, revokeInvitationAction } from "./actions";
import { INVITE_ACTION_INITIAL_STATE as IDLE, INVITE_COPY } from "@/lib/admin/invite-state";
import { ADMIN_ACTION_INITIAL_STATE } from "@/lib/admin/action-state";

const ADMIN = { id: "30000000-0000-4000-8000-000000000001", email: null, fullName: "Admin", glyph: null, role: "admin" as const };
const EXPIRES = "2026-10-28T12:00:00.123456+00:00";
const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

beforeEach(() => {
  for (const m of Object.values(mocks)) m.mockReset();
  mocks.getCurrentUser.mockResolvedValue(ADMIN);
  mocks.inviteTeacher.mockResolvedValue({ kind: "created", id: "inv-1", expiresAt: EXPIRES, mailSent: true });
  mocks.reissueInvitation.mockResolvedValue({ kind: "created", id: "inv-2", expiresAt: EXPIRES, mailSent: true });
  mocks.revokeInvitation.mockResolvedValue(true);
});

describe("inviteTeacherAction", () => {
  it("una alumna no invita: rechaza y no crea nada", async () => {
    mocks.getCurrentUser.mockResolvedValue({ ...ADMIN, role: "student" });
    await expect(inviteTeacherAction(IDLE, form({ email: "x@mail.com" }))).rejects.toThrow(/No autorizado/);
    expect(mocks.inviteTeacher).not.toHaveBeenCalled();
  });

  it("mail inválido: mensaje claro", async () => {
    await expect(inviteTeacherAction(IDLE, form({ email: "no-es-mail" }))).resolves.toEqual({
      error: INVITE_COPY.invalidEmail,
      success: null,
      resendEmail: null,
    });
    expect(mocks.inviteTeacher).not.toHaveBeenCalled();
  });

  it("normaliza el mail y firma con el admin de la sesión", async () => {
    await inviteTeacherAction(IDLE, form({ email: "  Nueva@Mail.com " }));
    expect(mocks.inviteTeacher).toHaveBeenCalledWith({ email: "nueva@mail.com", adminId: ADMIN.id, adminName: "Admin" });
  });

  it("creada: 'invitación enviada, vence el <fecha>' (c.1)", async () => {
    const state = await inviteTeacherAction(IDLE, form({ email: "nueva@mail.com" }));
    expect(state).toEqual({ error: null, success: "Invitación enviada a nueva@mail.com, vence el 28 de octubre de 2026.", resendEmail: null });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/panel/admin/invitaciones");
  });

  it("creada sin mail: lo dice y ofrece reenviar", async () => {
    mocks.inviteTeacher.mockResolvedValue({ kind: "created", id: "inv-1", expiresAt: EXPIRES, mailSent: false });
    const state = await inviteTeacherAction(IDLE, form({ email: "nueva@mail.com" }));
    expect(state.success).toMatch(/El mail no salió: usá Reenviar\.$/);
  });

  it("ya hay una pendiente: error y ofrece reenviar a ese mail (c.7)", async () => {
    mocks.inviteTeacher.mockResolvedValue({ kind: "pending_exists" });
    await expect(inviteTeacherAction(IDLE, form({ email: "nueva@mail.com" }))).resolves.toEqual({
      error: INVITE_COPY.pendingExists,
      success: null,
      resendEmail: "nueva@mail.com",
    });
  });

  it("ya es docente o admin", async () => {
    mocks.inviteTeacher.mockResolvedValue({ kind: "already_teacher" });
    expect((await inviteTeacherAction(IDLE, form({ email: "sol@mail.com" }))).error).toBe(INVITE_COPY.alreadyTeacher);
  });
});

describe("resendInvitationAction", () => {
  it("revoca y crea otra: 'invitación reenviada'", async () => {
    const state = await resendInvitationAction(IDLE, form({ email: "nueva@mail.com" }));
    expect(mocks.reissueInvitation).toHaveBeenCalledWith({ email: "nueva@mail.com", adminId: ADMIN.id, adminName: "Admin" });
    expect(state.success).toBe("Invitación reenviada a nueva@mail.com, vence el 28 de octubre de 2026.");
  });
});

describe("revokeInvitationAction", () => {
  it("id inválido: datos inválidos, sin tocar la base", async () => {
    expect((await revokeInvitationAction(ADMIN_ACTION_INITIAL_STATE, form({ invitationId: "x" }))).error).toBe("Datos inválidos.");
    expect(mocks.revokeInvitation).not.toHaveBeenCalled();
  });

  it("revoca una pendiente", async () => {
    const id = "5a0e3c1d-2b4f-4c6a-9d8e-7f1a2b3c4d5e";
    await expect(revokeInvitationAction(ADMIN_ACTION_INITIAL_STATE, form({ invitationId: id }))).resolves.toEqual({
      error: null,
      success: INVITE_COPY.revoked,
    });
    expect(mocks.revokeInvitation).toHaveBeenCalledWith({ id, adminId: ADMIN.id });
  });

  it("ya no estaba pendiente", async () => {
    mocks.revokeInvitation.mockResolvedValue(false);
    const id = "5a0e3c1d-2b4f-4c6a-9d8e-7f1a2b3c4d5e";
    expect((await revokeInvitationAction(ADMIN_ACTION_INITIAL_STATE, form({ invitationId: id }))).error).toBe(INVITE_COPY.notPending);
  });
});
