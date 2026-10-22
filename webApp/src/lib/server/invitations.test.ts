import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Result = { data: unknown; error: { code?: string; message: string } | null };

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  notify: vi.fn(),
  insertResult: { data: null, error: null } as Result,
  updateResult: { data: [], error: null } as Result,
  inserts: [] as { table: string; row: Record<string, unknown> }[],
  updates: [] as { table: string; patch: Record<string, unknown>; filters: unknown[][] }[],
}));

vi.mock("@/lib/server/mail/notify", () => ({ notifyTeacherInvitation: mocks.notify }));
vi.mock("@/lib/server/supabase-admin", () => ({
  getAdminSupabaseClient: () => ({
    rpc: mocks.rpc,
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => {
        mocks.inserts.push({ table, row });
        return { select: () => ({ single: async () => mocks.insertResult }) };
      },
      update: (patch: Record<string, unknown>) => {
        const filters: unknown[][] = [];
        const chain = {
          eq: (...f: unknown[]) => (filters.push(["eq", ...f]), chain),
          is: (...f: unknown[]) => (filters.push(["is", ...f]), chain),
          select: async () => {
            mocks.updates.push({ table, patch, filters });
            return mocks.updateResult;
          },
        };
        return chain;
      },
    }),
  }),
}));

import { acceptInvitation, inviteTeacher, reissueInvitation, revokeInvitation } from "./invitations";

const ADMIN = { adminId: "30000000-0000-4000-8000-000000000001", adminName: "Admin" };
const EXPIRES = "2026-10-28T12:00:00.123456+00:00";
const sha = (t: string) => createHash("sha256").update(t, "utf8").digest("hex");

beforeEach(() => {
  process.env.SITE_URL = "http://localhost:3101";
  mocks.rpc.mockReset();
  mocks.notify.mockReset();
  mocks.inserts.length = 0;
  mocks.updates.length = 0;
  mocks.insertResult = { data: { id: "inv-1", expires_at: EXPIRES }, error: null };
  mocks.updateResult = { data: [{ id: "inv-1" }], error: null };
  mocks.rpc.mockResolvedValue({ data: [], error: null });
  mocks.notify.mockResolvedValue(true);
});

describe("inviteTeacher", () => {
  it("guarda el hash y manda el token en claro solo en el link del mail (c.1)", async () => {
    const out = await inviteTeacher({ email: "nueva@mail.com", ...ADMIN });
    expect(out).toEqual({ kind: "created", id: "inv-1", expiresAt: EXPIRES, mailSent: true });

    const [{ table, row }] = mocks.inserts;
    expect(table).toBe("teacher_invitations");
    expect(row).toEqual({ email: "nueva@mail.com", token_hash: expect.stringMatching(/^[0-9a-f]{64}$/), invited_by: ADMIN.adminId });

    const [arg] = mocks.notify.mock.calls[0];
    const token = arg.acceptUrl.replace("http://localhost:3101/invitacion/", "");
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(sha(token)).toBe(row.token_hash);
    expect(JSON.stringify(row)).not.toContain(token);
    expect(arg).toMatchObject({ email: "nueva@mail.com", inviterName: "Admin", expiresAt: EXPIRES, invitationId: "inv-1" });
  });

  it("el mail no salió: la invitación queda creada y lo dice (lección T-020)", async () => {
    mocks.notify.mockResolvedValue(false);
    await expect(inviteTeacher({ email: "nueva@mail.com", ...ADMIN })).resolves.toMatchObject({ kind: "created", mailSent: false });
  });

  it("ya hay una pendiente para ese mail: pending_exists y no manda nada (c.7)", async () => {
    mocks.insertResult = {
      data: null,
      error: { code: "23505", message: 'duplicate key value violates unique constraint "teacher_invitations_pending_email"' },
    };
    await expect(inviteTeacher({ email: "nueva@mail.com", ...ADMIN })).resolves.toEqual({ kind: "pending_exists" });
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it("otro 23505 (choque de token) no se disfraza de pendiente", async () => {
    mocks.insertResult = { data: null, error: { code: "23505", message: 'duplicate key ... "teacher_invitations_token_hash_key"' } };
    await expect(inviteTeacher({ email: "nueva@mail.com", ...ADMIN })).rejects.toThrow();
  });

  it("la cuenta ya es docente o admin: already_teacher sin crear fila", async () => {
    mocks.rpc.mockResolvedValue({ data: [{ id: "u", role: "teacher" }], error: null });
    await expect(inviteTeacher({ email: "sol@mail.com", ...ADMIN })).resolves.toEqual({ kind: "already_teacher" });
    expect(mocks.rpc).toHaveBeenCalledWith("admin_user_by_email", { p_email: "sol@mail.com" });
    expect(mocks.inserts).toHaveLength(0);
  });

  it("una alumna con cuenta sí se invita", async () => {
    mocks.rpc.mockResolvedValue({ data: [{ id: "u", role: "student" }], error: null });
    await expect(inviteTeacher({ email: "alumna@mail.com", ...ADMIN })).resolves.toMatchObject({ kind: "created" });
  });
});

describe("revocar y reenviar", () => {
  it("revoca solo una pendiente y firma quién", async () => {
    await expect(revokeInvitation({ id: "inv-1", adminId: ADMIN.adminId })).resolves.toBe(true);
    const [u] = mocks.updates;
    expect(u.patch).toMatchObject({ revoked_by: ADMIN.adminId, revoked_at: expect.any(String) });
    expect(u.filters).toEqual([["eq", "id", "inv-1"], ["is", "accepted_at", null], ["is", "revoked_at", null]]);
  });

  it("si no había pendiente devuelve false", async () => {
    mocks.updateResult = { data: [], error: null };
    await expect(revokeInvitation({ id: "inv-1", adminId: ADMIN.adminId })).resolves.toBe(false);
  });

  it("reenviar revoca la pendiente del mail y crea otra fila (el token viejo muere)", async () => {
    await reissueInvitation({ email: "nueva@mail.com", ...ADMIN });
    expect(mocks.updates[0].filters).toEqual([["eq", "email", "nueva@mail.com"], ["is", "accepted_at", null], ["is", "revoked_at", null]]);
    expect(mocks.inserts).toHaveLength(1);
  });
});

describe("acceptInvitation", () => {
  it("token con otra forma: false sin tocar la base", async () => {
    await expect(acceptInvitation({ token: "corto", userId: "u" })).resolves.toBe(false);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("manda el hash, nunca el token, y el id de la sesión", async () => {
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    const token = "A".repeat(43);
    await expect(acceptInvitation({ token, userId: "u-1" })).resolves.toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith("accept_teacher_invitation", { p_token_hash: sha(token), p_user_id: "u-1" });
  });

  it("error de la base: false, neutro", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(acceptInvitation({ token: "A".repeat(43), userId: "u-1" })).resolves.toBe(false);
  });
});
