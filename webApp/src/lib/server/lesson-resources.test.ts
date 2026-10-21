import { beforeEach, describe, expect, it, vi } from "vitest";

const { getLessonAccess, createServiceRoleClient } = vi.hoisted(() => ({
  getLessonAccess: vi.fn(),
  createServiceRoleClient: vi.fn(),
}));
vi.mock("@/lib/server/lesson-player", () => ({ getLessonAccess }));
vi.mock("@/lib/supabase/service", () => ({ createServiceRoleClient }));

import { getLessonResourceRedirect, resourceRedirectTarget } from "./lesson-resources";

const LESSON = "11111111-1111-4111-8111-111111111111";
const OTHER_LESSON = "33333333-3333-4333-8333-333333333333";
const RESOURCE = "44444444-4444-4444-8444-444444444444";
const DRIVE = "https://drive.google.com/uc?export=download&id=";

describe("resourceRedirectTarget", () => {
  it("drive_file_id arma la URL de descarga de Drive", () => {
    expect(resourceRedirectTarget({ driveFileId: "1AbC_def-GHIjkl", url: null })).toBe(`${DRIVE}1AbC_def-GHIjkl`);
  });

  it("drive_file_id gana sobre url cuando estan los dos (asi los guarda el panel docente)", () => {
    expect(
      resourceRedirectTarget({ driveFileId: "1AbC_def-GHIjkl", url: "https://drive.google.com/file/d/1AbC_def-GHIjkl/view" }),
    ).toBe(`${DRIVE}1AbC_def-GHIjkl`);
  });

  it("sin drive_file_id redirige a url http(s)", () => {
    expect(resourceRedirectTarget({ driveFileId: null, url: "https://example.org/glosario-arcanos" })).toBe(
      "https://example.org/glosario-arcanos",
    );
    expect(resourceRedirectTarget({ driveFileId: null, url: "http://example.org/a" })).toBe("http://example.org/a");
  });

  it("drive_file_id con forma invalida no se interpola: cae a url o a null", () => {
    expect(resourceRedirectTarget({ driveFileId: "x&id=otro", url: null })).toBeNull();
    expect(resourceRedirectTarget({ driveFileId: "corto", url: "https://example.org/b" })).toBe("https://example.org/b");
  });

  it("url con esquema no http(s), relativa o basura: null", () => {
    expect(resourceRedirectTarget({ driveFileId: null, url: "javascript:alert(1)" })).toBeNull();
    expect(resourceRedirectTarget({ driveFileId: null, url: "data:text/html,hola" })).toBeNull();
    expect(resourceRedirectTarget({ driveFileId: null, url: "/leccion/otra" })).toBeNull();
    expect(resourceRedirectTarget({ driveFileId: null, url: "no es una url" })).toBeNull();
  });

  it("sin ningun localizador: null", () => {
    expect(resourceRedirectTarget({ driveFileId: null, url: null })).toBeNull();
  });
});

function fakeService(result: { data: unknown; error: unknown }) {
  const builder = { select: vi.fn(() => builder), eq: vi.fn(() => builder), maybeSingle: vi.fn(async () => result) };
  return { client: { from: vi.fn(() => builder) }, builder };
}

describe("getLessonResourceRedirect", () => {
  beforeEach(() => {
    getLessonAccess.mockReset();
    createServiceRoleClient.mockReset();
  });

  it("leccion inexistente para quien pregunta: null sin crear service_role", async () => {
    getLessonAccess.mockResolvedValue(null);
    expect(await getLessonResourceRedirect(LESSON, RESOURCE)).toBeNull();
    expect(createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("sin acceso: null sin crear service_role (el localizador ni se consulta)", async () => {
    getLessonAccess.mockResolvedValue({ lessonId: LESSON, hasAccess: false });
    expect(await getLessonResourceRedirect(LESSON, RESOURCE)).toBeNull();
    expect(createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("con acceso: lee solo lesson_id, drive_file_id, url por id y redirige", async () => {
    getLessonAccess.mockResolvedValue({ lessonId: LESSON, hasAccess: true });
    const { client, builder } = fakeService({
      data: { lesson_id: LESSON, drive_file_id: "SEED_PLACEHOLDER_PDF_1", url: null },
      error: null,
    });
    createServiceRoleClient.mockReturnValue(client);
    expect(await getLessonResourceRedirect(LESSON, RESOURCE)).toBe(`${DRIVE}SEED_PLACEHOLDER_PDF_1`);
    expect(client.from).toHaveBeenCalledWith("lesson_resources");
    expect(builder.select).toHaveBeenCalledWith("lesson_id, drive_file_id, url");
    expect(builder.eq).toHaveBeenCalledWith("id", RESOURCE);
  });

  it("recurso de otra leccion: null aunque haya acceso a esta", async () => {
    getLessonAccess.mockResolvedValue({ lessonId: LESSON, hasAccess: true });
    createServiceRoleClient.mockReturnValue(
      fakeService({ data: { lesson_id: OTHER_LESSON, drive_file_id: "SEED_PLACEHOLDER_HERB_1", url: null }, error: null })
        .client,
    );
    expect(await getLessonResourceRedirect(LESSON, RESOURCE)).toBeNull();
  });

  it("recurso inexistente: null", async () => {
    getLessonAccess.mockResolvedValue({ lessonId: LESSON, hasAccess: true });
    createServiceRoleClient.mockReturnValue(fakeService({ data: null, error: null }).client);
    expect(await getLessonResourceRedirect(LESSON, RESOURCE)).toBeNull();
  });

  it("error de la base: lanza sin el mensaje de Postgres", async () => {
    getLessonAccess.mockResolvedValue({ lessonId: LESSON, hasAccess: true });
    createServiceRoleClient.mockReturnValue(
      fakeService({ data: null, error: { code: "22P02", message: "invalid input syntax for type uuid" } }).client,
    );
    const err = await getLessonResourceRedirect(LESSON, RESOURCE).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain("22P02");
    expect((err as Error).message).not.toContain("invalid input");
  });
});
