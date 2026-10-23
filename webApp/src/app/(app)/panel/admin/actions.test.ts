import { beforeEach, describe, expect, it, vi } from "vitest";
// T-050: sin esto el sujeto real abre un cliente de Supabase y gasta el cupo de "ip:unknown"
// compartido entre tests; acá cada test arranca con el limitador vacío y una usuaria fija.
const { rateLimitSubject } = vi.hoisted(() => ({ rateLimitSubject: vi.fn() }));
vi.mock("@/lib/server/rate-limit-subject", () => ({ currentRateLimitSubject: rateLimitSubject }));
import { argsOf, queryChain } from "@/test/query-chain";

const { getCurrentUser, getAdminSupabaseClient, notifyEnrollmentActivated, notifyEnrollmentRejected, revalidatePath, resolveGrantTarget } =
  vi.hoisted(() => ({
    resolveGrantTarget: vi.fn(),
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
vi.mock("@/lib/server/enrollment-grant", () => ({ resolveGrantTarget }));

import {
  approveEnrollmentRequestAction,
  dismissReportAction,
  grantEnrollmentByEmailAction,
  hideReviewAction,
  rejectEnrollmentRequestAction,
  setEnrollmentAction,
  unhideReviewAction,
} from "./actions";
import { __resetRateLimiterForTests } from "@/lib/server/rate-limit";

beforeEach(() => {
  __resetRateLimiterForTests();
  rateLimitSubject.mockResolvedValue({ kind: "user", id: "u-test" });
});

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

// ---------------------------------------------------------------- T-037 · moderación de reseñas
const REVIEW = "47b62602-7ab4-4bc1-83f9-c1998d46bc87";
const REPORT = "5a0e3c1d-2b4f-4c6a-9d8e-7f1a2b3c4d5e";

function rpcReturning(result: unknown) {
  const rpc = vi.fn().mockResolvedValue(result);
  getAdminSupabaseClient.mockReturnValue({ rpc });
  return rpc;
}

describe("hideReviewAction", () => {
  it.each([[null], [{ ...ADMIN, role: "teacher" }]])("sin admin lanza y no toca la base (%#)", async (user) => {
    getCurrentUser.mockResolvedValue(user);
    await expect(hideReviewAction(REVIEW, INICIAL, form({ reason: "spam" }))).rejects.toThrow(/No autorizado/);
    expect(getAdminSupabaseClient).not.toHaveBeenCalled();
  });

  it.each([["   "], ["x".repeat(1001)]])("motivo inválido no llega a la base (%#)", async (reason) => {
    const out = await hideReviewAction(REVIEW, INICIAL, form({ reason }));
    expect(out.error).toBeTruthy();
    expect(getAdminSupabaseClient).not.toHaveBeenCalled();
  });

  it("un id que no es uuid no llega a la base", async () => {
    const out = await hideReviewAction("x", INICIAL, form({ reason: "spam" }));
    expect(out.error).toBeTruthy();
    expect(getAdminSupabaseClient).not.toHaveBeenCalled();
  });

  it("oculta con el id del admin de la sesión y revalida ficha, catálogo y cola", async () => {
    const rpc = rpcReturning({ data: 2, error: null });
    const out = await hideReviewAction(REVIEW, INICIAL, form({ reason: "  Datos de un tercero  ", adminId: "otro" }));
    expect(rpc).toHaveBeenCalledWith("moderate_hide_review", {
      p_review_id: REVIEW,
      p_admin_id: ADMIN.id,
      p_reason: "Datos de un tercero",
    });
    expect(out).toEqual({ error: null, success: "Reseña oculta. Se resolvieron 2 reportes." });
    expect(revalidatePath).toHaveBeenCalledWith("/cursos/[slug]", "page");
    expect(revalidatePath).toHaveBeenCalledWith("/cursos");
    expect(revalidatePath).toHaveBeenCalledWith("/panel/admin/resenas");
  });

  it.each([
    [0, "Reseña oculta."],
    [1, "Reseña oculta. Se resolvió 1 reporte."],
  ])("mensaje con %i reportes", async (n, msg) => {
    rpcReturning({ data: n, error: null });
    expect((await hideReviewAction(REVIEW, INICIAL, form({ reason: "spam" }))).success).toBe(msg);
  });

  it.each([
    ["P0002", /ya no existe/],
    ["42501", /No autorizado/],
    ["22023", /1 a 1000/],
    ["XX000", /No se pudo ocultar/],
  ])("el error %s se traduce sin detalle técnico", async (code, msg) => {
    rpcReturning({ data: null, error: { code, message: "detalle interno" } });
    const out = await hideReviewAction(REVIEW, INICIAL, form({ reason: "spam" }));
    expect(out.error).toMatch(msg);
    expect(out.error).not.toMatch(/detalle interno/);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("unhideReviewAction", () => {
  it("vuelve a mostrar", async () => {
    const rpc = rpcReturning({ data: true, error: null });
    const out = await unhideReviewAction(REVIEW, INICIAL, form({}));
    expect(rpc).toHaveBeenCalledWith("moderate_unhide_review", { p_review_id: REVIEW, p_admin_id: ADMIN.id });
    expect(out.success).toBe("La reseña vuelve a estar visible.");
  });

  it("si no estaba oculta lo dice", async () => {
    rpcReturning({ data: false, error: null });
    expect((await unhideReviewAction(REVIEW, INICIAL, form({}))).error).toBe("La reseña no estaba oculta.");
  });

  it("sin admin lanza", async () => {
    getCurrentUser.mockResolvedValue(null);
    await expect(unhideReviewAction(REVIEW, INICIAL, form({}))).rejects.toThrow(/No autorizado/);
    expect(getAdminSupabaseClient).not.toHaveBeenCalled();
  });
});

describe("dismissReportAction", () => {
  it("desestima", async () => {
    const rpc = rpcReturning({ data: true, error: null });
    const out = await dismissReportAction(REPORT, INICIAL, form({}));
    expect(rpc).toHaveBeenCalledWith("moderate_dismiss_report", { p_report_id: REPORT, p_admin_id: ADMIN.id });
    expect(out.success).toBe("Reporte desestimado. La reseña sigue visible.");
  });

  it("un reporte ya resuelto no se resuelve dos veces", async () => {
    rpcReturning({ data: false, error: null });
    expect((await dismissReportAction(REPORT, INICIAL, form({}))).error).toBe("Ese reporte ya estaba resuelto.");
  });

  it("sin admin lanza", async () => {
    getCurrentUser.mockResolvedValue({ ...ADMIN, role: "teacher" });
    await expect(dismissReportAction(REPORT, INICIAL, form({}))).rejects.toThrow(/No autorizado/);
    expect(getAdminSupabaseClient).not.toHaveBeenCalled();
  });
});

describe("grantEnrollmentByEmailAction", () => {
  it("datos inválidos no consultan nada", async () => {
    const fd = new FormData();
    fd.set("email", "no-es-mail");
    fd.set("courseSlug", "reiki-nivel-1");
    await expect(grantEnrollmentByEmailAction(INICIAL, fd)).resolves.toEqual({ error: "Datos inválidos.", success: null });
    expect(resolveGrantTarget).not.toHaveBeenCalled();
  });

  it("sin cuenta con ese mail: el mensaje del resolvedor, sin inscribir", async () => {
    resolveGrantTarget.mockResolvedValue({ ok: false, error: "No hay ninguna cuenta con ese mail." });
    const fd = new FormData();
    fd.set("email", "nadie@mail.com");
    fd.set("courseSlug", "reiki-nivel-1");
    await expect(grantEnrollmentByEmailAction(INICIAL, fd)).resolves.toEqual({
      error: "No hay ninguna cuenta con ese mail.",
      success: null,
    });
    expect(getAdminSupabaseClient).not.toHaveBeenCalled();
  });
});
