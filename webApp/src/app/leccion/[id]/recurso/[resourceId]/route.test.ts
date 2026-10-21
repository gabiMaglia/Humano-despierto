import { beforeEach, describe, expect, it, vi } from "vitest";

const { getLessonResourceRedirect } = vi.hoisted(() => ({ getLessonResourceRedirect: vi.fn() }));
vi.mock("@/lib/server/lesson-resources", () => ({ getLessonResourceRedirect }));

import { GET } from "./route";

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
    vi.spyOn(console, "error").mockImplementation(() => {});
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
