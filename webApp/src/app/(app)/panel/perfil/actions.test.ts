import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock se eleva sobre los imports: lo que usa la factory tiene que existir antes, via vi.hoisted.
const { createClient, createServiceRoleClient } = vi.hoisted(() => ({
  createClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/lib/supabase/service", () => ({ createServiceRoleClient }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { updateProfileAction, uploadAvatarAction } from "./actions";
import { MAX_AVATAR_BYTES } from "@/lib/validation/image";

const INITIAL = { error: null, success: null };
const UID = "20000000-0000-4000-8000-00000000000a";

function fileForm(bytes: Uint8Array<ArrayBuffer>, name: string, type: string): FormData {
  const fd = new FormData();
  fd.set("avatar", new File([bytes], name, { type }));
  return fd;
}

describe("uploadAvatarAction", () => {
  beforeEach(() => createClient.mockReset());

  it("rechaza un .jpg cuyos bytes son un PDF sin tocar Supabase (c.6)", async () => {
    const pdf = new TextEncoder().encode("%PDF-1.7\n");
    const r = await uploadAvatarAction(INITIAL, fileForm(pdf, "foto.jpg", "image/jpeg"));
    expect(r.error).toMatch(/JPG, PNG o WEBP/);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("rechaza 2 MB + 1 byte aunque la cabecera sea JPEG (c.6)", async () => {
    const big = new Uint8Array(MAX_AVATAR_BYTES + 1);
    big.set([0xff, 0xd8, 0xff]);
    const r = await uploadAvatarAction(INITIAL, fileForm(big, "foto.jpg", "image/jpeg"));
    expect(r.error).toMatch(/2 MB/);
    expect(createClient).not.toHaveBeenCalled();
  });

  // D-34 (T-047): la sesion ya no tiene policy de INSERT en `uploads`. Sube service_role, despues de
  // validar los bytes y con el path armado desde `auth.getUser()`, nunca desde el request.
  function clients({ updateError = null as unknown } = {}) {
    const sessionUpload = vi.fn().mockResolvedValue({ error: null });
    const sessionRemove = vi.fn().mockResolvedValue({ error: null });
    const updateEq = vi.fn().mockResolvedValue({ error: updateError });
    const single = vi.fn().mockResolvedValue({ data: { avatar_path: null }, error: null });
    createClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: UID } } }) },
      from: () => ({
        select: () => ({ eq: () => ({ single }) }),
        update: () => ({ eq: updateEq }),
      }),
      storage: { from: () => ({ upload: sessionUpload, remove: sessionRemove }) },
    });
    const upload = vi.fn().mockResolvedValue({ error: null });
    const remove = vi.fn().mockResolvedValue({ error: null });
    createServiceRoleClient.mockReturnValue({ storage: { from: () => ({ upload, remove }) } });
    return { sessionUpload, sessionRemove, upload, remove };
  }
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  it("sube con service_role a avatars/<uid>/<uuid>.png con el content-type de los bytes, no el declarado", async () => {
    const { sessionUpload, sessionRemove, upload } = clients();
    const r = await uploadAvatarAction(INITIAL, fileForm(png, "foto.jpg", "image/jpeg"));

    expect(r).toEqual({ error: null, success: "Imagen actualizada." });
    const [path, , options] = upload.mock.calls[0];
    expect(path).toMatch(new RegExp(`^avatars/${UID}/[0-9a-f-]{36}\\.png$`));
    expect(options).toMatchObject({ contentType: "image/png", upsert: false });
    expect(sessionUpload).not.toHaveBeenCalled();
    expect(sessionRemove).not.toHaveBeenCalled();
  });

  it("si el UPDATE falla, borra con service_role lo recien subido", async () => {
    const { upload, remove } = clients({ updateError: { code: "23514" } });
    const r = await uploadAvatarAction(INITIAL, fileForm(png, "foto.png", "image/png"));
    expect(r.error).toBeTruthy();
    const [path] = upload.mock.calls[0];
    expect(remove).toHaveBeenCalledWith([path]);
  });
});

describe("updateProfileAction", () => {
  beforeEach(() => createClient.mockReset());

  it("frena una bio con link antes de crear el cliente (c.9)", async () => {
    const fd = new FormData();
    fd.set("fullName", "Sol Mayor");
    fd.set("bio", "Material en https://drive.google.com/file/d/X");
    fd.set("phone", "");
    fd.set("birthDate", "");
    const r = await updateProfileAction(INITIAL, fd);
    expect(r.error).toBeTruthy();
    expect(createClient).not.toHaveBeenCalled();
  });
});
