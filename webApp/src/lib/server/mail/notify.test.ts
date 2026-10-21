import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendMail, getAdminSupabaseClient } = vi.hoisted(() => ({
  sendMail: vi.fn(),
  getAdminSupabaseClient: vi.fn(),
}));
vi.mock("@/lib/server/mail/send", () => ({ sendMail }));
vi.mock("@/lib/server/supabase-admin", () => ({ getAdminSupabaseClient }));
vi.mock("@/lib/server/site-url", () => ({ getSiteUrl: () => "http://localhost:3000" }));

import { notifyEnrollmentRejected } from "./notify";

const STUDENT = "d0000000-0000-4000-8000-000000000003";
const COURSE = "c0000000-0000-4000-8000-000000000009";

function fakeDb(claimRows: unknown[]) {
  const row = (data: unknown) => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data, error: null }) }) }),
  });
  const rpc = vi.fn(async () => ({ data: claimRows, error: null }));
  const db = {
    auth: {
      admin: { getUserById: async () => ({ data: { user: { email: "alumna@test.local" } }, error: null }) },
    },
    from: (table: string) => {
      if (table === "profiles") return row({ id: STUDENT, full_name: "Alumna de Prueba" });
      if (table === "courses") {
        return row({ id: COURSE, title: "Herbario", slug: "herbario-lunar", teacher_id: "t", teacher: { full_name: "Aurora" } });
      }
      if (table === "mail_log") {
        return { update: () => ({ eq: () => ({ eq: () => ({ is: async () => ({ error: null, count: 1 }) }) }) }) };
      }
      throw new Error(`tabla inesperada: ${table}`);
    },
    rpc,
  };
  getAdminSupabaseClient.mockReturnValue(db);
  return { rpc };
}

describe("notifyEnrollmentRejected", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reclama con el uuid CANÓNICO del curso y manda un mail con el motivo", async () => {
    const { rpc } = fakeDb([{ id: "m1", claimed_at: "2026-10-21T00:00:00Z" }]);
    sendMail.mockResolvedValue({ ok: true });
    await notifyEnrollmentRejected({ studentId: STUDENT, courseId: COURSE.toUpperCase(), reason: "Cupo completo" });
    expect(rpc).toHaveBeenCalledWith("claim_or_reclaim_mail_slot", {
      p_recipient_user_id: STUDENT,
      p_mail_type: "enrollment_rejected",
      p_scope_key: COURSE,
    });
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0].to.email).toBe("alumna@test.local");
    expect(sendMail.mock.calls[0][0].text).toContain("Cupo completo");
  });

  it("si el turno ya se usó (mail_log) no manda nada", async () => {
    fakeDb([]);
    await notifyEnrollmentRejected({ studentId: STUDENT, courseId: COURSE, reason: null });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("un SMTP caído no rompe a quien llama (c.11)", async () => {
    fakeDb([{ id: "m1", claimed_at: "2026-10-21T00:00:00Z" }]);
    sendMail.mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(
      notifyEnrollmentRejected({ studentId: STUDENT, courseId: COURSE, reason: null }),
    ).resolves.toBeUndefined();
  });
});
