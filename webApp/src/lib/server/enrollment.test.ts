import { beforeEach, describe, expect, it, vi } from "vitest";
import { argsOf, queryChain, type ChainCall } from "@/test/query-chain";

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
const { signUploadUrls, serviceClient } = vi.hoisted(() => ({ signUploadUrls: vi.fn(), serviceClient: { storage: {} } }));
vi.mock("@/lib/server/uploads", () => ({ signUploadUrls }));
vi.mock("@/lib/supabase/service", () => ({ createServiceRoleClient: () => serviceClient }));

import { getStudentDashboard, getStudentEnrollmentState } from "./enrollment";

const USER = "d0000000-0000-4000-8000-000000000003";
const COURSE = "c0000000-0000-4000-8000-000000000009";

function session(userId: string | null, resolve: (table: string, calls: ChainCall[]) => unknown) {
  const log: { table: string; calls: ChainCall[] }[] = [];
  const from = vi.fn((table: string) => {
    const { chain, calls } = queryChain((c) => resolve(table, c));
    log.push({ table, calls });
    return chain;
  });
  createClient.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null } }) },
    from,
  });
  return { from, log };
}

describe("getStudentEnrollmentState", () => {
  beforeEach(() => createClient.mockReset());

  it("sin sesión es anonymous y no consulta la base", async () => {
    const { from } = session(null, () => ({ data: null, error: null }));
    expect(await getStudentEnrollmentState(COURSE)).toEqual({ status: "anonymous" });
    expect(from).not.toHaveBeenCalled();
  });

  it("con sesión y sin fila es none, filtrando por la alumna de la sesión", async () => {
    const { log } = session(USER, () => ({ data: null, error: null }));
    expect(await getStudentEnrollmentState(COURSE)).toEqual({ status: "none" });
    const eqs = log[0].calls.filter((c) => c.method === "eq").map((c) => c.args);
    expect(eqs).toEqual(expect.arrayContaining([["course_id", COURSE], ["user_id", USER]]));
  });

  it.each([
    [{ status: "requested", requested_at: "2026-10-21T10:00:00Z", decided_reason: null }, { status: "requested", requestedAt: "2026-10-21T10:00:00Z" }],
    [{ status: "active", requested_at: null, decided_reason: null }, { status: "active" }],
    [{ status: "revoked", requested_at: null, decided_reason: null }, { status: "revoked" }],
    [{ status: "rejected", requested_at: "2026-10-21T10:00:00Z", decided_reason: "Cupo completo" }, { status: "rejected", decidedReason: "Cupo completo" }],
  ])("mapea %o", async (row, expected) => {
    session(USER, () => ({ data: row, error: null }));
    expect(await getStudentEnrollmentState(COURSE)).toEqual(expected);
  });

  it("un error de lectura se propaga, no se disfraza de 'none'", async () => {
    session(USER, () => ({ data: null, error: { message: "boom" } }));
    await expect(getStudentEnrollmentState(COURSE)).rejects.toThrow(/boom/);
  });
});

describe("getStudentDashboard · requests", () => {
  beforeEach(() => createClient.mockReset());

  it("sin cursos activos devuelve igual las solicitudes requested y rejected (c.3, c.7)", async () => {
    const { log } = session(USER, (table, calls) => {
      const esSolicitudes = calls.some((c) => c.method === "in");
      if (table === "enrollments" && esSolicitudes) {
        return {
          data: [
            { course_id: COURSE, status: "requested", requested_at: "2026-10-21T10:00:00Z", decided_reason: null, course: { slug: "herbario-lunar", title: "Herbario" } },
            { course_id: "x", status: "rejected", requested_at: "2026-10-20T10:00:00Z", decided_reason: "Cupo completo", course: [{ slug: "reiki-nivel-1", title: "Reiki" }] },
          ],
          error: null,
        };
      }
      return { data: [], error: null };
    });

    const dash = await getStudentDashboard();
    expect(dash.courses).toEqual([]);
    expect(dash.requests).toEqual([
      { courseId: COURSE, slug: "herbario-lunar", title: "Herbario", status: "requested", requestedAt: "2026-10-21T10:00:00Z", decidedReason: null },
      { courseId: "x", slug: "reiki-nivel-1", title: "Reiki", status: "rejected", requestedAt: "2026-10-20T10:00:00Z", decidedReason: "Cupo completo" },
    ]);
    const solicitudes = log.find((l) => l.calls.some((c) => c.method === "in"));
    expect(argsOf(solicitudes!.calls, "in")).toEqual(["status", ["requested", "rejected"]]);
    const activos = log.find((l) => l.table === "enrollments" && !l.calls.some((c) => c.method === "in"));
    expect(activos!.calls.map((c) => c.args)).toContainEqual(["status", "active"]);
  });

  it("sin sesión no hay cursos ni solicitudes", async () => {
    session(null, () => ({ data: [], error: null }));
    expect(await getStudentDashboard()).toEqual({ courses: [], requests: [] });
  });
});

describe("getStudentDashboard · portada (D-90)", () => {
  const COVER = `covers/${COURSE}/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.jpg`;
  const course = (id: string, cover: string | null) => ({
    course_id: id,
    enrolled_at: "2026-10-01T10:00:00Z",
    course: {
      id, slug: id, title: "T", title_em: null, discipline: "Tarot", level: "Inicial", roman_num: null, moon_glyph: null,
      cover_path: cover, teacher: { full_name: "Luna" }, course_modules: [],
    },
  });

  beforeEach(() => {
    createClient.mockReset();
    signUploadUrls.mockReset();
  });

  it("lee cover_path con la sesión y firma sólo esas portadas, en una llamada", async () => {
    const { log } = session(USER, (table, calls) => {
      if (table === "enrollments" && !calls.some((c) => c.method === "in")) {
        return { data: [course(COURSE, COVER), course("sin", null)], error: null };
      }
      return { data: [], error: null };
    });
    signUploadUrls.mockResolvedValue(new Map([[COVER, "https://s/c?token=1"]]));
    const dash = await getStudentDashboard();
    const activos = log.find((l) => l.table === "enrollments" && !l.calls.some((c) => c.method === "in"));
    expect(String(argsOf(activos!.calls, "select")?.[0])).toMatch(/cover_path/);
    expect(signUploadUrls).toHaveBeenCalledTimes(1);
    expect(signUploadUrls).toHaveBeenCalledWith(serviceClient, [COVER, null]);
    expect(dash.courses.map((c) => [c.courseId, c.coverUrl])).toEqual([[COURSE, "https://s/c?token=1"], ["sin", null]]);
  });
});
