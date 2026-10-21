import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  createClient: vi.fn(),
  getAdminSupabaseClient: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/server/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/server/supabase-admin", () => ({ getAdminSupabaseClient: mocks.getAdminSupabaseClient }));
vi.mock("@/lib/server/mail/notify", () => ({ notifyEnrollmentActivated: vi.fn(), notifyEnrollmentRejected: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { moderateAnnouncement } from "./actions";
import { ADMIN_ACTION_INITIAL_STATE } from "@/lib/admin/action-state";

const ANN = "a3100000-0000-4000-8000-000000000001";
const ADMIN = { id: "30000000-0000-4000-8000-000000000001", role: "admin" };

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  for (const m of Object.values(mocks)) m.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("moderateAnnouncement", () => {
  it("quien no es admin no llega a la base", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "x", role: "teacher" });
    await expect(moderateAnnouncement(ADMIN_ACTION_INITIAL_STATE, form({ announcementId: ANN, reason: "x" }))).rejects.toThrow(/admin/);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("sin motivo se rechaza sin crear el cliente", async () => {
    mocks.getCurrentUser.mockResolvedValue(ADMIN);
    const r = await moderateAnnouncement(ADMIN_ACTION_INITIAL_STATE, form({ announcementId: ANN, reason: "" }));
    expect(r.error).toMatch(/motivo/);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("modera con el cliente de SESIÓN (el guard firma), nunca con service_role", async () => {
    mocks.getCurrentUser.mockResolvedValue(ADMIN);
    let values: unknown = null;
    const chain = { eq: () => chain, select: async () => ({ data: [{ id: ANN }], error: null }) };
    mocks.createClient.mockResolvedValue({ from: () => ({ update: (v: unknown) => ((values = v), chain) }) });
    const r = await moderateAnnouncement(ADMIN_ACTION_INITIAL_STATE, form({ announcementId: ANN, reason: "Fuera de lugar" }));
    expect(r).toEqual({ error: null, success: "Anuncio retirado." });
    expect(values).toMatchObject({ deleted_by: ADMIN.id, deleted_reason: "Fuera de lugar" });
    expect(mocks.getAdminSupabaseClient).not.toHaveBeenCalled();
  });
});
