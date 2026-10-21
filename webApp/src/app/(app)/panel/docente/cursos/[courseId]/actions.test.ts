import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, createServiceRoleClient, requireTeacher, assertOwnsCourse } = vi.hoisted(() => ({
  createClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
  requireTeacher: vi.fn(),
  assertOwnsCourse: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/lib/supabase/service", () => ({ createServiceRoleClient }));
vi.mock("@/lib/server/teacher", () => ({ requireTeacher, assertOwnsCourse }));
vi.mock("@/lib/server/youtube", () => ({ resolveYoutubeVideo: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { removeCourseCoverAction, uploadCourseCoverAction } from "./actions";
import { MAX_COVER_BYTES } from "@/lib/validation/image";

const INITIAL = { error: null, success: null };
const TEACHER = { id: "20000000-0000-4000-8000-00000000000a", role: "teacher" };
const COURSE = "40000000-0000-4000-8000-00000000000a";
const OLD = `covers/${COURSE}/11111111-2222-4333-8444-555555555555.jpg`;
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function form(bytes: Uint8Array<ArrayBuffer> | null, courseId = COURSE, name = "portada.png", type = "image/png") {
  const fd = new FormData();
  fd.set("courseId", courseId);
  if (bytes) fd.set("cover", new File([bytes], name, { type }));
  return fd;
}

function sessionClient({ current = null as string | null, updateError = null as unknown } = {}) {
  const upload = vi.fn().mockResolvedValue({ error: null });
  const remove = vi.fn().mockResolvedValue({ error: null });
  const updateEq = vi.fn().mockResolvedValue({ error: updateError });
  const update = vi.fn(() => ({ eq: updateEq }));
  const client = {
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: { cover_path: current }, error: null }) }) }),
      update,
    }),
    storage: { from: () => ({ upload, remove }) },
  };
  return { client, upload, remove, update, updateEq };
}

function serviceClient() {
  const upload = vi.fn().mockResolvedValue({ error: null });
  const remove = vi.fn().mockResolvedValue({ error: null });
  const bucket = vi.fn(() => ({ upload, remove }));
  return { client: { storage: { from: bucket } }, upload, remove, bucket };
}

describe("uploadCourseCoverAction", () => {
  let service: ReturnType<typeof serviceClient>;
  beforeEach(() => {
    createClient.mockReset();
    service = serviceClient();
    createServiceRoleClient.mockReset().mockReturnValue(service.client);
    requireTeacher.mockReset().mockResolvedValue(TEACHER);
    assertOwnsCourse.mockReset().mockResolvedValue(undefined);
  });

  it("c.2 · 3,1 MB con cabecera PNG: mensaje claro y Storage no recibe nada", async () => {
    const big = new Uint8Array(Math.ceil(MAX_COVER_BYTES * 1.04));
    big.set(PNG);
    const r = await uploadCourseCoverAction(INITIAL, form(big));
    expect(r.error).toMatch(/3 MB/);
    expect(createClient).not.toHaveBeenCalled();
    expect(service.upload).not.toHaveBeenCalled();
  });

  it("c.2 · un PDF renombrado .png se rechaza por sus bytes sin abrir sesion ni tocar Storage", async () => {
    const pdf = new TextEncoder().encode("%PDF-1.7\n");
    const r = await uploadCourseCoverAction(INITIAL, form(pdf, COURSE, "portada.png", "image/png"));
    expect(r.error).toMatch(/JPG, PNG o WEBP/);
    expect(createClient).not.toHaveBeenCalled();
    expect(service.upload).not.toHaveBeenCalled();
  });

  it("un courseId que no es uuid no llega a la base", async () => {
    const r = await uploadCourseCoverAction(INITIAL, form(PNG, "tarot-iniciatico"));
    expect(r.error).toBeTruthy();
    expect(assertOwnsCourse).not.toHaveBeenCalled();
    expect(service.upload).not.toHaveBeenCalled();
  });

  it("curso ajeno: assertOwnsCourse corta antes de subir", async () => {
    const { client } = sessionClient();
    createClient.mockResolvedValue(client);
    assertOwnsCourse.mockRejectedValue(new Error("No autorizado: ese curso no te pertenece."));
    const r = await uploadCourseCoverAction(INITIAL, form(PNG));
    expect(r.error).toMatch(/no te pertenece/);
    expect(assertOwnsCourse).toHaveBeenCalledWith(COURSE, TEACHER.id);
    expect(service.upload).not.toHaveBeenCalled();
  });

  it("c.1 · D-34: sube con service_role a covers/<course>/<uuid>.png, apunta la fila con la sesion y borra la anterior", async () => {
    const session = sessionClient({ current: OLD });
    createClient.mockResolvedValue(session.client);
    const r = await uploadCourseCoverAction(INITIAL, form(PNG, COURSE, "portada.jpg", "image/jpeg"));
    expect(r).toEqual({ error: null, success: "Portada actualizada." });
    expect(service.bucket).toHaveBeenCalledWith("uploads");
    const [path, , options] = service.upload.mock.calls[0];
    expect(path).toMatch(new RegExp(`^covers/${COURSE}/[0-9a-f-]{36}\\.png$`));
    // El tipo sale de los bytes, no de lo que declaro el navegador.
    expect(options).toMatchObject({ contentType: "image/png", upsert: false });
    // La sesion nunca sube: no tiene policy de INSERT (D-34).
    expect(session.upload).not.toHaveBeenCalled();
    expect(session.update).toHaveBeenCalledWith({ cover_path: path });
    expect(session.updateEq).toHaveBeenCalledWith("id", COURSE);
    expect(session.remove).toHaveBeenCalledWith([OLD]);
  });

  it("si el UPDATE falla, borra lo recien subido y conserva la anterior", async () => {
    const session = sessionClient({ current: OLD, updateError: { code: "23514" } });
    createClient.mockResolvedValue(session.client);
    const r = await uploadCourseCoverAction(INITIAL, form(PNG));
    expect(r.error).toBeTruthy();
    const [path] = service.upload.mock.calls[0];
    expect(service.remove).toHaveBeenCalledWith([path]);
    expect(session.remove).not.toHaveBeenCalled();
  });

  it("si la subida falla, no toca la fila", async () => {
    const session = sessionClient({ current: OLD });
    createClient.mockResolvedValue(session.client);
    service.upload.mockResolvedValue({ error: { message: "boom" } });
    const r = await uploadCourseCoverAction(INITIAL, form(PNG));
    expect(r.error).toMatch(/No se pudo subir/);
    expect(session.update).not.toHaveBeenCalled();
  });
});

describe("removeCourseCoverAction", () => {
  beforeEach(() => {
    createClient.mockReset();
    createServiceRoleClient.mockReset();
    requireTeacher.mockReset().mockResolvedValue(TEACHER);
    assertOwnsCourse.mockReset().mockResolvedValue(undefined);
  });

  it("vacia cover_path y despues borra el objeto con la sesion de la duena", async () => {
    const { client, remove, update } = sessionClient({ current: OLD });
    createClient.mockResolvedValue(client);
    const r = await removeCourseCoverAction(INITIAL, form(null));
    expect(r).toEqual({ error: null, success: "Portada quitada." });
    expect(update).toHaveBeenCalledWith({ cover_path: null });
    expect(remove).toHaveBeenCalledWith([OLD]);
    expect(createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("curso ajeno: no toca nada", async () => {
    const { client, remove, update } = sessionClient({ current: OLD });
    createClient.mockResolvedValue(client);
    assertOwnsCourse.mockRejectedValue(new Error("No autorizado: ese curso no te pertenece."));
    const r = await removeCourseCoverAction(INITIAL, form(null));
    expect(r.error).toMatch(/no te pertenece/);
    expect(update).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });
});
