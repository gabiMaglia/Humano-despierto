import { beforeEach, describe, expect, it, vi } from "vitest";

const { connection, createServiceRoleClient } = vi.hoisted(() => ({
  connection: vi.fn(async () => {}),
  createServiceRoleClient: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection }));
vi.mock("@/lib/supabase/service", () => ({ createServiceRoleClient }));

import { SIGNED_URL_TTL_SECONDS, signPublicUploadUrls, signUploadUrls } from "./uploads";

const A = "covers/40000000-0000-4000-8000-00000000000a/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.jpg";
const B = "covers/40000000-0000-4000-8000-00000000000b/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.png";

function clientWith(createSignedUrls: ReturnType<typeof vi.fn>) {
  return { storage: { from: () => ({ createSignedUrls }) } } as never;
}

describe("signUploadUrls", () => {
  it("firma por lote, solo los paths presentes y sin repetir, con TTL de una hora", async () => {
    const createSignedUrls = vi.fn().mockResolvedValue({
      data: [
        { path: A, signedUrl: "https://s/a?token=1", error: null },
        { path: B, signedUrl: null, error: "Object not found" },
      ],
      error: null,
    });
    const urls = await signUploadUrls(clientWith(createSignedUrls), [A, null, B, A]);
    expect(SIGNED_URL_TTL_SECONDS).toBe(3600);
    expect(createSignedUrls).toHaveBeenCalledWith([A, B], SIGNED_URL_TTL_SECONDS);
    expect(urls.get(A)).toBe("https://s/a?token=1");
    // Un objeto que falta no tumba la pagina: esa card cae al degradado.
    expect(urls.has(B)).toBe(false);
  });

  it("sin paths no llama a Storage", async () => {
    const createSignedUrls = vi.fn();
    expect((await signUploadUrls(clientWith(createSignedUrls), [null, null])).size).toBe(0);
    expect(createSignedUrls).not.toHaveBeenCalled();
  });

  it("un error de la llamada entera devuelve un mapa vacio, no tira", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const createSignedUrls = vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
    expect((await signUploadUrls(clientWith(createSignedUrls), [A])).size).toBe(0);
    spy.mockRestore();
  });
});

describe("signPublicUploadUrls", () => {
  beforeEach(() => {
    connection.mockClear();
    createServiceRoleClient.mockReset();
  });

  it("espera un request ANTES de firmar: una URL que vence no puede quedar en HTML prerenderizado", async () => {
    const orden: string[] = [];
    connection.mockImplementation(async () => void orden.push("connection"));
    createServiceRoleClient.mockImplementation(() => {
      orden.push("service");
      return clientWith(vi.fn().mockResolvedValue({ data: [], error: null }));
    });
    await signPublicUploadUrls([A]);
    expect(orden).toEqual(["connection", "service"]);
  });
});
