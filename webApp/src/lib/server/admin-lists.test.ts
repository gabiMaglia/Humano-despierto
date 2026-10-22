import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/server/supabase-admin", () => ({ getAdminSupabaseClient: () => ({ rpc: mocks.rpc }) }));

import { listInvitationsPage, listUsersPage } from "./admin-lists";
import { encodeCursor } from "@/lib/admin/cursor";

const AT = "2026-10-21T12:00:00.0005+00:00";
const user = (n: number) => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  full_name: `Delfina ${n}`,
  email: `delf${n}@mail.com`,
  role: "student",
  created_at: AT,
});

beforeEach(() => {
  mocks.rpc.mockReset();
});

describe("listUsersPage", () => {
  it("pide 26 con q y cursor, y el cursor siguiente lleva el timestamp tal cual", async () => {
    mocks.rpc.mockResolvedValue({ data: Array.from({ length: 26 }, (_, i) => user(i)), error: null });
    const after = { at: AT, id: user(99).id };
    const page = await listUsersPage({ q: "delf", after });
    expect(mocks.rpc).toHaveBeenCalledWith("admin_list_users", { p_q: "delf", p_after_at: AT, p_after_id: after.id, p_limit: 26 });
    expect(page.items).toHaveLength(25);
    expect(page.items[0]).toEqual({ id: user(0).id, fullName: "Delfina 0", email: "delf0@mail.com", role: "student", createdAt: AT });
    expect(page.next).toBe(encodeCursor({ at: AT, id: user(24).id }));
  });

  it("un cursor que Postgres rechaza (30 de febrero) relee desde el principio, sin 500 (c.9)", async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: null, error: { code: "22008", message: "date/time field value out of range" } })
      .mockResolvedValueOnce({ data: [user(1)], error: null });
    const page = await listUsersPage({ q: null, after: { at: "2026-02-30 00:00:00+00", id: user(1).id } });
    expect(mocks.rpc).toHaveBeenLastCalledWith("admin_list_users", { p_q: null, p_after_at: null, p_after_id: null, p_limit: 26 });
    expect(page.items).toHaveLength(1);
  });

  it("sin cursor, un error de la base sí se propaga", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(listUsersPage({ q: null, after: null })).rejects.toThrow(/admin_list_users/);
  });
});

describe("listInvitationsPage", () => {
  it("calcula el estado con el reloj que recibe y no expone nada más", async () => {
    mocks.rpc.mockResolvedValue({
      data: [
        { id: "a", email: "a@mail.com", created_at: AT, expires_at: "2026-10-20T00:00:00+00:00", accepted_at: null, revoked_at: null, invited_by_name: "Admin" },
      ],
      error: null,
    });
    const page = await listInvitationsPage({ q: null, after: null }, new Date("2026-10-21T00:00:00Z"));
    expect(page.items[0]).toEqual({
      id: "a",
      email: "a@mail.com",
      createdAt: AT,
      expiresAt: "2026-10-20T00:00:00+00:00",
      acceptedAt: null,
      revokedAt: null,
      invitedByName: "Admin",
      status: "vencida",
    });
  });
});
