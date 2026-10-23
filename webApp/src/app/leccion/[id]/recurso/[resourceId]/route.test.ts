import { beforeEach, describe, expect, it, vi } from "vitest";

const { getLessonResourceRedirect } = vi.hoisted(() => ({ getLessonResourceRedirect: vi.fn() }));
vi.mock("@/lib/server/lesson-resources", () => ({ getLessonResourceRedirect }));
const { subject } = vi.hoisted(() => ({ subject: vi.fn() }));
vi.mock("@/lib/server/rate-limit-subject", () => ({ currentRateLimitSubject: subject }));

import { GET } from "./route";
import { __resetRateLimiterForTests } from "@/lib/server/rate-limit";

const LESSON = "11111111-1111-4111-8111-111111111111";
const RESOURCE = "44444444-4444-4444-8444-444444444444";

function call(id: string, resourceId: string): Promise<Response> {
  const req = new Request(`http://localhost:3000/leccion/${id}/recurso/${resourceId}`);
  return GET(req as never, { params: Promise.resolve({ id, resourceId }) });
}

async function snapshot(res: Response) {
  return {
    status: res.status,
    body: await res.text(),
    cacheControl: res.headers.get("cache-control"),
    robots: res.headers.get("x-robots-tag"),
    location: res.headers.get("location"),
  };
}

const DENIED = { status: 403, body: "", cacheControl: "private, no-store", robots: "noindex, nofollow", location: null };

describe("GET /leccion/[id]/recurso/[resourceId]", () => {
  beforeEach(() => {
    getLessonResourceRedirect.mockReset();
    __resetRateLimiterForTests();
    subject.mockResolvedValue({ kind: "user", id: "u-1" });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("T-050 · pasado el tope responde 429 con Retry-After, sin consultar el recurso", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-22T12:05:00Z"), toFake: ["Date"] });
    getLessonResourceRedirect.mockResolvedValue("https://drive.google.com/file/d/X");
    for (let i = 0; i < 60; i++) expect((await call(LESSON, RESOURCE)).status).toBe(302);
    getLessonResourceRedirect.mockClear();
    const res = await call(LESSON, RESOURCE);
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("300");
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("location")).toBeNull();
    expect(getLessonResourceRedirect).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("con destino: 302 al destino, privado y sin cache", async () => {
    getLessonResourceRedirect.mockResolvedValue("https://drive.google.com/uc?export=download&id=SEED_PLACEHOLDER_PDF_1");
    expect(await snapshot(await call(LESSON, RESOURCE))).toEqual({
      status: 302,
      body: "",
      cacheControl: "private, no-store",
      robots: "noindex, nofollow",
      location: "https://drive.google.com/uc?export=download&id=SEED_PLACEHOLDER_PDF_1",
    });
    expect(getLessonResourceRedirect).toHaveBeenCalledWith(LESSON, RESOURCE);
  });

  it("sin destino (sin acceso, inexistente, de otra leccion): 403 vacio", async () => {
    getLessonResourceRedirect.mockResolvedValue(null);
    expect(await snapshot(await call(LESSON, RESOURCE))).toEqual(DENIED);
  });

  it("excepcion de la base: el mismo 403 vacio, sin traza", async () => {
    getLessonResourceRedirect.mockRejectedValue(new Error("No se pudo leer el recurso (22P02)"));
    expect(await snapshot(await call(LESSON, RESOURCE))).toEqual(DENIED);
  });

  it("ids malformados: 403 vacio sin llegar a la base", async () => {
    for (const [id, rid] of [
      [LESSON, "no-es-un-uuid"],
      ["no-es-un-uuid", RESOURCE],
      [LESSON, `${RESOURCE}' or 1=1`],
    ]) {
      expect(await snapshot(await call(id, rid))).toEqual(DENIED);
    }
    expect(getLessonResourceRedirect).not.toHaveBeenCalled();
  });
});
