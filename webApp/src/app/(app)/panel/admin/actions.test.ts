import { beforeEach, describe, expect, it, vi } from "vitest";
import { argsOf, queryChain } from "@/test/query-chain";

const { getCurrentUser, getAdminSupabaseClient, notifyEnrollmentActivated, notifyEnrollmentRejected, revalidatePath } =
  vi.hoisted(() => ({
    getCurrentUser: vi.fn(),
    getAdminSupabaseClient: vi.fn(),
    notifyEnrollmentActivated: vi.fn(),
    notifyEnrollmentRejected: vi.fn(),
    revalidatePath: vi.fn(),
  }));
vi.mock("@/lib/server/auth", () => ({ getCurrentUser }));
vi.mock("@/lib/server/supabase-admin", () => ({ getAdminSupabaseClient }));
vi.mock("@/lib/server/mail/notify", () => ({ notifyEnrollmentActivated, notifyEnrollmentRejected }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { approveEnrollmentRequestAction, rejectEnrollmentRequestAction, setEnrollmentAction } from "./actions";

const ADMIN = { id: "d0000000-0000-4000-8000-000000000001", role: "admin" };
const ENROLLMENT = "a0430000-0000-4000-8000-000000000001";
const STUDENT = "d0000000-0000-4000-8000-000000000003";
const COURSE = "c0000000-0000-4000-8000-000000000009";
const INICIAL = { error: null, success: null };

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

function dbReturning(result: unknown) {
  const { chain, calls } = queryChain(() => result);
  const from = vi.fn(() => chain);
  getAdminSupabaseClient.mockReturnValue({ from });
  return { from, calls };
}

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUser.mockResolvedValue(ADMIN);
});

describe("approveEnrollmentRequestAction", () => {
  it("sin rol admin tira y no toca la base", async () => {
    getCurrentUser.mockResolvedValue({ ...ADMIN, role: "student" });
    await expect(approveEnrollmentRequestAction(INICIAL, form({ enrollmentId: ENROLLMENT }))).rejects.toThrow(/admin/);
    expect(getAdminSupabaseClient).not.toHaveBeenCalled();
  });

  it("un id que no es uuid se rechaza antes de la base", async () => {
    const r = await approveEnrollmentRequestAction(INICIAL, form({ enrollmentId: "1 or 1=1" }));
    expect(r).toEqual({ error: "Datos inválidos.", success: null });
    expect(getAdminSupabaseClient).not.toHaveBeenCalled();
  });

  it("aprueba solo desde requested o rejected, firma, limpia el motivo y notifica una vez (c.6, c.9)", async () => {
    const { calls } = dbReturning({ data: [{ user_id: STUDENT, course_id: COURSE }], error: null });
    const r = await approveEnrollmentRequestAction(INICIAL, form({ enrollmentId: ENROLLMENT }));
    expect(r).toEqual({ error: null, success: "Inscripción aprobada." });
    expect(argsOf(calls, "update")?.[0]).toMatchObject({ status: "active", granted_by: ADMIN.id, decided_reason: null });
    expect(argsOf(calls, "eq")).toEqual(["id", ENROLLMENT]);
    expect(argsOf(calls, "in")).toEqual(["status", ["requested", "rejected"]]);
    expect(notifyEnrollmentActivated).toHaveBeenCalledTimes(1);
    expect(notifyEnrollmentActivated).toHaveBeenCalledWith({ studentId: STUDENT, courseId: COURSE });
  });

  it("si otra admin ya la resolvió (0 filas) no notifica y lo dice (c.6)", async () => {
    dbReturning({ data: [], error: null });
    const r = await approveEnrollmentRequestAction(INICIAL, form({ enrollmentId: ENROLLMENT }));
    expect(r.error).toBe("Esta solicitud ya fue resuelta. Recargá el panel para ver su estado.");
    expect(notifyEnrollmentActivated).not.toHaveBeenCalled();
  });
});

describe("rejectEnrollmentRequestAction", () => {
  it("un motivo con link se rechaza antes de la base (c.8)", async () => {
    const r = await rejectEnrollmentRequestAction(
      INICIAL,
      form({ enrollmentId: ENROLLMENT, reason: "mirá drive.google.com/file/d/abc" }),
    );
    expect(r).toEqual({ error: "El motivo no puede contener links.", success: null });
    expect(getAdminSupabaseClient).not.toHaveBeenCalled();
  });

  it("un motivo de más de 500 caracteres se rechaza antes de la base", async () => {
    const r = await rejectEnrollmentRequestAction(INICIAL, form({ enrollmentId: ENROLLMENT, reason: "a".repeat(501) }));
    expect(r.error).toBe("El motivo no puede superar 500 caracteres.");
    expect(getAdminSupabaseClient).not.toHaveBeenCalled();
  });

  it("rechaza solo desde requested, guarda el motivo y lo manda en el mail (c.7)", async () => {
    const { calls } = dbReturning({ data: [{ user_id: STUDENT, course_id: COURSE }], error: null });
    const r = await rejectEnrollmentRequestAction(INICIAL, form({ enrollmentId: ENROLLMENT, reason: "  Cupo completo  " }));
    expect(r).toEqual({ error: null, success: "Solicitud rechazada." });
    expect(argsOf(calls, "update")?.[0]).toMatchObject({ status: "rejected", decided_reason: "Cupo completo" });
    expect(calls.filter((c) => c.method === "eq").map((c) => c.args)).toEqual([
      ["id", ENROLLMENT],
      ["status", "requested"],
    ]);
    expect(notifyEnrollmentRejected).toHaveBeenCalledWith({ studentId: STUDENT, courseId: COURSE, reason: "Cupo completo" });
  });

  it("sin motivo guarda null y el mail va sin motivo (c.7)", async () => {
    const { calls } = dbReturning({ data: [{ user_id: STUDENT, course_id: COURSE }], error: null });
    await rejectEnrollmentRequestAction(INICIAL, form({ enrollmentId: ENROLLMENT, reason: "   " }));
    expect(argsOf(calls, "update")?.[0]).toMatchObject({ decided_reason: null });
    expect(notifyEnrollmentRejected).toHaveBeenCalledWith({ studentId: STUDENT, courseId: COURSE, reason: null });
  });

  it("traduce el 42501 del guard de localizador exacto y no notifica (c.8)", async () => {
    dbReturning({ data: null, error: { code: "42501", message: "el motivo contiene un localizador de contenido pago" } });
    const r = await rejectEnrollmentRequestAction(INICIAL, form({ enrollmentId: ENROLLMENT, reason: "aQw4w9WgXcQ" }));
    expect(r.error).toMatch(/contenido pago/);
    expect(notifyEnrollmentRejected).not.toHaveBeenCalled();
  });
});

describe("setEnrollmentAction", () => {
  it("al activar limpia el motivo: reactivar una rejected no viola el CHECK de consistencia (T-043)", async () => {
    const { calls } = dbReturning({ data: null, error: null });
    const r = await setEnrollmentAction(INICIAL, form({ userId: STUDENT, courseId: COURSE, status: "active" }));
    expect(r.error).toBeNull();
    expect(argsOf(calls, "upsert")?.[0]).toMatchObject({ status: "active", decided_reason: null, granted_by: ADMIN.id });
  });
});
